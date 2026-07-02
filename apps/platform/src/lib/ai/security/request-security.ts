import { randomUUID } from 'node:crypto';
import type { NextRequest } from 'next/server';
import type { z } from 'zod';
import { BYOK_ERROR_CODE, BYOK_REQUEST_BODY_LIMIT_BYTES } from '@/lib/ai/byok/constants';
import { ByokPublicError } from '@/lib/ai/byok/errors';
import { prisma } from '@/lib/prisma';

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

function getRequestProtocol(request: NextRequest): string {
  const directProtocol = new URL(request.url).protocol.replace(':', '');

  if (process.env.BYOK_TRUST_PROXY_HEADERS !== 'true') {
    return directProtocol;
  }

  return request.headers.get('x-forwarded-proto') || directProtocol;
}

export function getRequestIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export function createRequestId(): string {
  return `req_${randomUUID()}`;
}

export async function assertByokRequestSecurity(
  request: NextRequest,
  options: { requireJson?: boolean; requireOrigin?: boolean } = {},
): Promise<void> {
  const protocol = getRequestProtocol(request);

  if (process.env.NODE_ENV === 'production' && protocol !== 'https') {
    throw new ByokPublicError(BYOK_ERROR_CODE.FORBIDDEN, 403, '生产环境仅允许 HTTPS 请求。');
  }

  if (options.requireJson) {
    const contentType = request.headers.get('content-type') || '';

    if (!contentType.toLowerCase().includes('application/json')) {
      throw new ByokPublicError(
        BYOK_ERROR_CODE.INVALID_REQUEST,
        400,
        'Content-Type 必须为 application/json。',
      );
    }
  }

  const contentLength = Number(request.headers.get('content-length') || 0);

  if (contentLength > BYOK_REQUEST_BODY_LIMIT_BYTES) {
    throw new ByokPublicError(BYOK_ERROR_CODE.INVALID_REQUEST, 413, '请求体超出限制。');
  }

  if (options.requireOrigin) {
    const origin = request.headers.get('origin');

    if (!origin) {
      throw new ByokPublicError(BYOK_ERROR_CODE.FORBIDDEN, 403, '请求来源不受信任。');
    }

    const allowedOrigins = await getAllowedOrigins();

    if (!allowedOrigins.has(origin)) {
      throw new ByokPublicError(BYOK_ERROR_CODE.FORBIDDEN, 403, '请求来源不受信任。');
    }

    const fetchSite = request.headers.get('sec-fetch-site');

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

export async function parseLimitedJsonBody<T>(
  request: NextRequest,
  schema: z.ZodType<T>,
): Promise<T> {
  const text = await request.text();

  if (Buffer.byteLength(text, 'utf8') > BYOK_REQUEST_BODY_LIMIT_BYTES) {
    throw new ByokPublicError(BYOK_ERROR_CODE.INVALID_REQUEST, 413, '请求体超出限制。');
  }

  try {
    return schema.parse(JSON.parse(text));
  } catch {
    throw new ByokPublicError(BYOK_ERROR_CODE.INVALID_REQUEST, 400, '请求参数无效。');
  }
}
