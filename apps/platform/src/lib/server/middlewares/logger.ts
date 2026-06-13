import type { NextRequest, NextResponse } from 'next/server';
import { logger } from '../logger';
import type { ApiContext, ApiMiddleware } from '../types';

function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function getStatusLabel(status: number) {
  if (status < 300) return 'ok';
  if (status < 400) return 'redirect';
  if (status < 500) return 'client_error';
  return 'server_error';
}

export const loggerMiddleware: ApiMiddleware = async (
  req: NextRequest,
  _context: ApiContext,
  next: () => Promise<NextResponse>,
) => {
  const startTime = performance.now();
  const { method, nextUrl } = req;
  const { pathname: path } = nextUrl;
  const queryParams = Object.fromEntries(req.nextUrl.searchParams);
  const requestId = generateRequestId();
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = (req.headers.get('user-agent') || 'unknown').slice(0, 100);

  logger.info(
    {
      requestId,
      method,
      path,
      ip,
      userAgent,
      queryParams: Object.keys(queryParams).length > 0 ? queryParams : undefined,
      type: 'request_start',
    },
    `${method} ${path} - request start`,
  );

  try {
    const response = await next();
    const duration = Math.round(performance.now() - startTime);
    response.headers.set('x-request-id', requestId);
    response.headers.set('x-response-time', `${duration}ms`);

    logger.info(
      {
        requestId,
        method,
        path,
        status: response.status,
        statusLabel: getStatusLabel(response.status),
        duration,
        type: 'request_complete',
      },
      `${method} ${path} - status: ${response.status} | duration: ${duration}ms`,
    );

    return response;
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    const err = error as Error;

    logger.error(
      {
        requestId,
        method,
        path,
        duration,
        error: { message: err.message, stack: err.stack, name: err.name },
        type: 'request_error',
      },
      `${method} ${path} - request failed | duration: ${duration}ms | error: ${err.message}`,
    );

    throw error;
  }
};
