import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { AiPublicError, toAiPublicError } from './errors';
import { createByokErrorOptions, requireByokUser } from './byok/route-helpers';
import { createRequestId } from './security/request-security';
import { COMMON_ERROR, createErrorResponse, createSuccessResponse } from '@/lib/server';

export async function requireAiUser(
  request: NextRequest,
  requestId: string,
  permissionCode = 'AI:CHAT:USE',
): Promise<string> {
  return requireByokUser(request, requestId, permissionCode);
}

export async function parseJsonBySchema<T extends z.ZodType>(
  request: NextRequest,
  schema: T,
): Promise<z.infer<T>> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    throw new AiPublicError('INVALID_REQUEST', 400, '请求 JSON 格式无效');
  }

  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    throw new AiPublicError('INVALID_REQUEST', 422, parsed.error.issues[0]?.message ?? '请求参数无效');
  }

  return parsed.data;
}

export function getAiRequestId(): string {
  return createRequestId();
}

export function createAiSuccessResponse<T>(data: T, message = '操作成功', status = 200) {
  return createSuccessResponse(data, message, status);
}

export function createAiErrorResponse(error: unknown, requestId: string) {
  const publicError = toAiPublicError(error);

  return createErrorResponse(
    COMMON_ERROR.REQUEST_ERROR,
    publicError.message,
    null,
    publicError.status,
    createByokErrorOptions(requestId, publicError.code),
  );
}
