import type { NextRequest, NextResponse } from 'next/server';
import {
  COMMON_ERROR,
  ERROR_CODES,
  HTTP_STATUS_TO_ERROR_CODE,
} from '@/constants/error-codes';
import { createErrorResponse } from '../responses/error';
import { logger } from '../logger';
import type { ApiContext, ApiMiddleware } from '../types';

function isServiceUnavailableError(error: { code?: unknown; message?: string }) {
  return (
    error.code === 'ECONNREFUSED' ||
    error.code === 'ETIMEDOUT' ||
    error.message?.includes('service is unavailable') ||
    error.message?.includes('connect ECONNREFUSED')
  );
}

function getHttpErrorType(status: number): IServer.ErrorType {
  const code = HTTP_STATUS_TO_ERROR_CODE[status] ?? COMMON_ERROR.UNKNOWN.code;

  return ERROR_CODES[code] ?? COMMON_ERROR.UNKNOWN;
}

export const errorHandlerMiddleware: ApiMiddleware = async (
  _req: NextRequest,
  _context: ApiContext,
  next: () => Promise<NextResponse>,
) => {
  try {
    return await next();
  } catch (error) {
    logger.error({ err: error }, 'Unhandled API error');

    const err = error as { code?: unknown; status?: unknown; message?: string };
    if (typeof err.status === 'number') {
      return createErrorResponse(getHttpErrorType(err.status), err.message, error, err.status);
    }

    if (isServiceUnavailableError(err)) {
      return createErrorResponse(
        COMMON_ERROR.SERVICE_UNAVAILABLE,
        err.message,
        error,
        503,
      );
    }

    if (typeof err.code === 'string') {
      const found = ERROR_CODES[err.code];

      if (found) {
        return createErrorResponse(found, err.message, error, 500);
      }
    }

    return createErrorResponse(COMMON_ERROR.SYSTEM_ERROR, err.message, error);
  }
};
