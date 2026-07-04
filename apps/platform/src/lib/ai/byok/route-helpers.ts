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
} from '@/lib/server';
import { getAuthPayloadBySessionToken, getSessionCookieName } from '@/lib/server/auth-session';
import { writeByokAuditEvent } from '@/lib/ai/security/audit';
import { getRequestIp } from '@/lib/ai/security/request-security';

function getByokResponseCode(status: number): IServer.ErrorCode {
  return HTTP_STATUS_TO_ERROR_CODE[status] ?? COMMON_ERROR.REQUEST_ERROR.code;
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
): NextResponse<IByok.RouteErrorResponseBody> {
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
