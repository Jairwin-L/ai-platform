import type { NextRequest, NextResponse } from 'next/server';
import {
  createErrorResponseFromException,
  createHttpErrorResponse,
} from '../responses/error';
import { logger } from '../logger';
import type { ApiContext, ApiMiddleware } from '../types';

export const errorHandlerMiddleware: ApiMiddleware = async (
  _req: NextRequest,
  _context: ApiContext,
  next: () => Promise<NextResponse>,
) => {
  try {
    return await next();
  } catch (error) {
    logger.error({ err: error }, 'Unhandled API error');

    const err = error as { status?: unknown; message?: string };
    if (typeof err.status === 'number') {
      return createHttpErrorResponse(err.status, err.message, error);
    }

    return createErrorResponseFromException(error);
  }
};
