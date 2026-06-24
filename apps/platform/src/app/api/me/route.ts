import type { NextRequest } from 'next/server';
import { AUTH_ERROR } from '@/constants/error-codes';
import { createErrorResponse, createSuccessResponse, withApiHandler } from '@/lib/server';
import { getAuthPayloadBySessionToken, getSessionCookieName } from '@/lib/server/auth-session';

export const GET = withApiHandler(async (request: NextRequest) => {
  const token = request.cookies.get(getSessionCookieName())?.value;
  const payload = await getAuthPayloadBySessionToken(token);

  if (!payload) {
    return createErrorResponse(AUTH_ERROR.UNAUTHORIZED, undefined, null, 401);
  }

  return createSuccessResponse(payload);
});
