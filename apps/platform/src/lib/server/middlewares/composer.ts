import type { NextRequest, NextResponse } from 'next/server';
import { errorHandlerMiddleware } from './error';
import { loggerMiddleware } from './logger';
import {
  authMiddleware,
  requirePermission,
  requireRole,
} from './auth';
import type { ApiContext, ApiHandler, ApiMiddleware, RouteParams } from '../types';

export function withMiddleware(middlewares: ApiMiddleware[], handler: ApiHandler): ApiHandler {
  return async (req: NextRequest, context: ApiContext): Promise<NextResponse> => {
    async function exec(index: number): Promise<NextResponse> {
      if (index >= middlewares.length) {
        return handler(req, context);
      }

      return middlewares[index](req, context, () => exec(index + 1));
    }

    return exec(0);
  };
}

function adapt(wrapped: ApiHandler) {
  return async (request: NextRequest, route: RouteParams = {}) => {
    const context: ApiContext = { params: route.params };
    return wrapped(request, context);
  };
}

export function withApiHandler(handler: ApiHandler) {
  const wrapped = withMiddleware([loggerMiddleware, errorHandlerMiddleware], handler);

  return adapt(wrapped);
}

export function withPermissionApiHandler(permissions: string[], handler: ApiHandler) {
  const wrapped = withMiddleware(
    [
      loggerMiddleware,
      errorHandlerMiddleware,
      authMiddleware,
      requirePermission(...permissions),
    ],
    handler,
  );

  return adapt(wrapped);
}

export function withAuthenticatedApiHandler(handler: ApiHandler) {
  const wrapped = withMiddleware(
    [loggerMiddleware, errorHandlerMiddleware, authMiddleware],
    handler,
  );

  return adapt(wrapped);
}

export const withAuthApiHandler = withAuthenticatedApiHandler;

export function withRoleApiHandler(roles: string[], handler: ApiHandler) {
  const wrapped = withMiddleware(
    [
      loggerMiddleware,
      errorHandlerMiddleware,
      authMiddleware,
      requireRole(...roles),
    ],
    handler,
  );

  return adapt(wrapped);
}
