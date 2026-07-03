import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  BYOK_AUDIT_EVENT,
  BYOK_ERROR_CODE,
  BYOK_SAFE_RESPONSE_HEADERS,
} from './constants';
import { ByokPublicError, toByokPublicError } from './errors';
import { getAuthPayloadBySessionToken, getSessionCookieName } from '@/lib/server/auth-session';
import { writeByokAuditEvent } from '@/lib/ai/security/audit';
import { getRequestIp } from '@/lib/ai/security/request-security';

type ByokErrorResponseBody = IByok.RouteErrorResponseBody;

export function createByokJsonResponse<T>(data: T, status = 200): NextResponse<T> {
  return NextResponse.json(data, {
    status,
    headers: BYOK_SAFE_RESPONSE_HEADERS,
  });
}

export function createByokErrorResponse(
  error: unknown,
  requestId: string,
): NextResponse<ByokErrorResponseBody> {
  const publicError = toByokPublicError(error);

  return NextResponse.json(
    {
      error: {
        code: publicError.code,
        message: publicError.message,
        requestId,
      },
    },
    {
      status: publicError.status,
      headers: BYOK_SAFE_RESPONSE_HEADERS,
    },
  );
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
