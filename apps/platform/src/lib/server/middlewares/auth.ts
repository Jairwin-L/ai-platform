import type { NextRequest, NextResponse } from 'next/server';
import { AUTH_ERROR } from '@/constants/error-codes';
import { createErrorResponse } from '../responses/error';
import type { ApiContext, ApiMiddleware } from '../types';

export function requirePermission(...required: string[]): ApiMiddleware {
  return async (_req: NextRequest, context: ApiContext, next: () => Promise<NextResponse>) => {
    const {user} = context;

    if (!user) {
      return createErrorResponse(AUTH_ERROR.UNAUTHORIZED, undefined, null, 401);
    }

    const ok = required.every((code) => user.permissions?.includes(code) ?? false);
    if (!ok) {
      return createErrorResponse(
        AUTH_ERROR.FORBIDDEN,
        `Missing permission: ${required.join(', ')}`,
        null,
        403,
      );
    }

    return next();
  };
}

export function requireRole(...required: string[]): ApiMiddleware {
  return async (_req: NextRequest, context: ApiContext, next: () => Promise<NextResponse>) => {
    const {user} = context;

    if (!user) {
      return createErrorResponse(AUTH_ERROR.UNAUTHORIZED, undefined, null, 401);
    }

    const ok = user.roles?.some((role) => required.includes(role)) ?? false;
    if (!ok) {
      return createErrorResponse(
        AUTH_ERROR.FORBIDDEN,
        `Required role: ${required.join(', ')}`,
        null,
        403,
      );
    }

    return next();
  };
}
