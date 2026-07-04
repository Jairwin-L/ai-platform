import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  BYOK_AUDIT_EVENT,
  BYOK_ERROR_CODE,
  BYOK_SAFE_RESPONSE_HEADERS,
} from './constants';
import { ByokPublicError, toByokPublicError } from './errors';
import {
  COMMON_ERROR,
  HTTP_STATUS_TO_ERROR_CODE,
  type ApiErrorResponse,
  type ApiResponse,
} from '@/lib/server';
import { getAuthPayloadBySessionToken, getSessionCookieName } from '@/lib/server/auth-session';
import { writeByokAuditEvent } from '@/lib/ai/security/audit';
import { getRequestIp } from '@/lib/ai/security/request-security';

type ByokErrorResponseBody = IByok.RouteErrorResponseBody;

function getByokResponseCode(status: number): number {
  return HTTP_STATUS_TO_ERROR_CODE[status] ?? COMMON_ERROR.REQUEST_ERROR.code;
}

export function createByokJsonResponse<T>(
  data: T,
  status = 200,
  message = '操作成功',
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      code: status,
      success: true,
      message,
      data,
      timestamp: Date.now(),
    },
    {
      status,
      headers: BYOK_SAFE_RESPONSE_HEADERS,
    },
  );
}

function createByokErrorHeaders(requestId: string): HeadersInit {
  return {
    ...BYOK_SAFE_RESPONSE_HEADERS,
    'x-request-id': requestId,
  };
}

export function createByokErrorResponse(
  error: unknown,
  requestId: string,
): NextResponse<ByokErrorResponseBody> {
  const publicError = toByokPublicError(error);
  const body: ApiErrorResponse = {
    code: getByokResponseCode(publicError.status),
    success: false,
    message: publicError.message,
    errorCode: publicError.code,
    data: null,
    timestamp: Date.now(),
  };

  return NextResponse.json(body, {
    status: publicError.status,
    headers: createByokErrorHeaders(requestId),
  });
}

export async function requireByokUser(request: NextRequest, requestId: string): Promise<string> {
  const token = request.cookies.get(getSessionCookieName())?.value;
  const payload = await getAuthPayloadBySessionToken(token);

  if (!payload) {
    writeByokAuditEvent({
      eventType: BYOK_AUDIT_EVENT.UNAUTHORIZED_ACCESS_ATTEMPT,
      requestId,
      ip: getRequestIp(request),
      result: 'blocked',
      reasonCode: BYOK_ERROR_CODE.UNAUTHENTICATED,
    });
    throw new ByokPublicError(BYOK_ERROR_CODE.UNAUTHENTICATED, 401);
  }

  return payload.user.id;
}
