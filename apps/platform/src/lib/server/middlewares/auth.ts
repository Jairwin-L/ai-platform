import type { NextRequest, NextResponse } from 'next/server';
import { AUTH_ERROR } from '@/constants/error-codes';
import { getAuthUserBySessionToken, getSessionCookieName } from '../auth-session';
import { createErrorResponse } from '../responses/error';
import type { ApiContext, ApiMiddleware } from '../types';

export const authSessionMiddleware: ApiMiddleware = async (
  req: NextRequest,
  ctx: ApiContext,
  next: () => Promise<NextResponse>,
) => {
  const token = req.cookies.get(getSessionCookieName())?.value;
  ctx.user = (await getAuthUserBySessionToken(token)) ?? undefined;

  return next();
};

export function requirePermission(...required: string[]): ApiMiddleware {
  return async (_req: NextRequest, context: ApiContext, next: () => Promise<NextResponse>) => {
    const { user } = context;

    if (!user) {
      return createErrorResponse(AUTH_ERROR.UNAUTHORIZED, undefined, null, 401);
    }

    const ok = required.every((code) => user.permissions?.includes(code) ?? false);
    if (!ok) {
      return createErrorResponse(
        AUTH_ERROR.FORBIDDEN,
        `缺少权限：${required.join(', ')}`,
        null,
        403,
      );
    }

    return next();
  };
}

export function requireRole(...required: string[]): ApiMiddleware {
  return async (_req: NextRequest, context: ApiContext, next: () => Promise<NextResponse>) => {
    const { user } = context;

    if (!user) {
      return createErrorResponse(AUTH_ERROR.UNAUTHORIZED, undefined, null, 401);
    }

    const ok = user.roles?.some((role) => required.includes(role)) ?? false;
    if (!ok) {
      return createErrorResponse(
        AUTH_ERROR.FORBIDDEN,
        `需要以下角色之一：${required.join(', ')}`,
        null,
        403,
      );
    }

    return next();
  };
}
