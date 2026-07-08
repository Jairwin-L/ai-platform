import type { NextRequest } from 'next/server';
import {
  BYOK_AUDIT_EVENT,
  BYOK_ERROR_CODE,
  BYOK_SAFE_RESPONSE_HEADERS,
} from './constants';
import { ByokPublicError } from './errors';
import {
  COMMON_ERROR,
  ERROR_CODES,
  HTTP_STATUS_TO_ERROR_CODE,
  type ErrorResponseOptions,
  type ErrorType,
} from '@/lib/server';
import { getAuthPayloadBySessionToken, getSessionCookieName } from '@/lib/server/auth-session';
import { writeByokAuditEvent } from '@/lib/ai/security/audit';
import { getRequestIp } from '@/lib/ai/security/request-security';
import { getMissingPermissionMessage } from '@/constants/permissions';

export function getByokErrorResponseType(status: number): ErrorType {
  const code = HTTP_STATUS_TO_ERROR_CODE[status] ?? COMMON_ERROR.REQUEST_ERROR.code;

  return ERROR_CODES[code] ?? COMMON_ERROR.REQUEST_ERROR;
}

function createByokErrorHeaders(requestId: string): HeadersInit {
  return {
    ...BYOK_SAFE_RESPONSE_HEADERS,
    'x-request-id': requestId,
  };
}

export function createByokErrorOptions(
  requestId: string,
  errorCode: string,
): ErrorResponseOptions {
  return {
    errorCode,
    headers: createByokErrorHeaders(requestId),
  };
}

export async function requireByokUser(
  request: NextRequest,
  requestId: string,
  permissionCode?: string,
): Promise<string> {
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

  if (permissionCode && !payload.permissions.includes(permissionCode)) {
    throw new ByokPublicError(
      BYOK_ERROR_CODE.FORBIDDEN,
      403,
      getMissingPermissionMessage([permissionCode]),
    );
  }

  return payload.user.id;
}
