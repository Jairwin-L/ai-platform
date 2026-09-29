import type { Request } from 'express';
import type { z } from 'zod';
import { BYOK_ERROR_CODE, BYOK_REQUEST_BODY_LIMIT_BYTES } from '@/lib/ai/byok/constants';
import { ByokPublicError } from '@/lib/ai/byok/errors';
import { prisma } from '@/infra/prisma/prisma-client';
import { resolveClientIp } from '@/common/http/client-ip';
import { createRequestId as createNewRequestId } from '@/common/http/request-id';

const SYSTEM_SETTINGS_ID = 1;

function parseAllowedOrigins(value: string | null | undefined): Set<string> {
  const configured = (value || '')
    .split(',')
    .flatMap((item) => item.split('\n'))
    .map((origin) => origin.trim())
    .filter(Boolean);

  return new Set(configured);
}

async function getAllowedOrigins(): Promise<Set<string>> {
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: SYSTEM_SETTINGS_ID },
      select: { byok_allowed_origins: true },
    });

    return parseAllowedOrigins(settings?.byok_allowed_origins);
  } catch {
    return new Set();
  }
}

function getHeader(request: Pick<Request, 'headers'>, name: string): string | null {
  const value = request.headers[name];
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/**
 * 请求协议。db-service 在 platform 反向代理与 nginx 之后，直连协议永远是 http，
 * 只有显式信任代理头时才读 X-Forwarded-Proto；多级代理时取最前面那一跳（客户端到入口）。
 */
function getRequestProtocol(request: Pick<Request, 'headers' | 'protocol'>): string {
  const directProtocol = request.protocol;

  if (process.env.BYOK_TRUST_PROXY_HEADERS !== 'true') {
    return directProtocol;
  }

  const forwardedProto = getHeader(request, 'x-forwarded-proto')?.split(',')[0]?.trim();
  return forwardedProto || directProtocol;
}

/** 审计与 BYOK 限流用的客户端 IP，口径与全局限流一致（不信任 X-Forwarded-For 第一段） */
export function getRequestIp(request: Pick<Request, 'headers'>): string {
  return resolveClientIp(request) ?? 'unknown';
}

/** 复用请求日志中间件分配的请求 id，审计日志与响应头 x-request-id 对得上 */
export function createRequestId(request?: Pick<Request, 'headers'>): string {
  const existing = request ? getHeader(request, 'x-request-id') : null;
  return existing?.startsWith('req_') ? existing : createNewRequestId();
}

export async function assertByokRequestSecurity(
  request: Pick<Request, 'headers' | 'protocol'>,
  options: { requireJson?: boolean; requireOrigin?: boolean } = {},
): Promise<void> {
  const protocol = getRequestProtocol(request);

  if (process.env.NODE_ENV === 'production' && protocol !== 'https') {
    throw new ByokPublicError(BYOK_ERROR_CODE.FORBIDDEN, 403, '生产环境仅允许 HTTPS 请求。');
  }

  if (options.requireJson) {
    const contentType = getHeader(request, 'content-type') || '';

    if (!contentType.toLowerCase().includes('application/json')) {
      throw new ByokPublicError(
        BYOK_ERROR_CODE.INVALID_REQUEST,
        400,
        'Content-Type 必须为 application/json。',
      );
    }
  }

  const contentLength = Number(getHeader(request, 'content-length') || 0);

  if (contentLength > BYOK_REQUEST_BODY_LIMIT_BYTES) {
    throw new ByokPublicError(BYOK_ERROR_CODE.INVALID_REQUEST, 413, '请求体超出限制。');
  }

  if (options.requireOrigin) {
    const origin = getHeader(request, 'origin');

    if (!origin) {
      throw new ByokPublicError(BYOK_ERROR_CODE.FORBIDDEN, 403, '请求来源不受信任。');
    }

    const allowedOrigins = await getAllowedOrigins();

    if (!allowedOrigins.has(origin)) {
      throw new ByokPublicError(BYOK_ERROR_CODE.FORBIDDEN, 403, '请求来源不受信任。');
    }

    const fetchSite = getHeader(request, 'sec-fetch-site');

    if (
      fetchSite &&
      fetchSite !== 'same-origin' &&
      fetchSite !== 'same-site' &&
      fetchSite !== 'none'
    ) {
      throw new ByokPublicError(BYOK_ERROR_CODE.FORBIDDEN, 403, '跨站请求不被允许。');
    }
  }
}

/**
 * 校验已解析的请求体。
 *
 * 请求体由 Express 解析，体积上限已由 assertByokRequestSecurity 按 Content-Length 拦过一层，
 * 这里再按序列化后的字节数兜底一次（分块传输时没有 Content-Length）。校验失败不回传字段细节。
 */
export function parseLimitedJsonBody<T>(body: unknown, schema: z.ZodType<T>): T {
  const serialized = JSON.stringify(body ?? null);

  if (Buffer.byteLength(serialized, 'utf8') > BYOK_REQUEST_BODY_LIMIT_BYTES) {
    throw new ByokPublicError(BYOK_ERROR_CODE.INVALID_REQUEST, 413, '请求体超出限制。');
  }

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    throw new ByokPublicError(BYOK_ERROR_CODE.INVALID_REQUEST, 400, '请求参数无效。');
  }

  return parsed.data;
}
