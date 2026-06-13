import { NextResponse } from 'next/server';
import {
  COMMON_ERROR,
  ERROR_CODES,
  HTTP_STATUS_TO_ERROR_CODE,
} from '@/constants/error-codes';
import type { ApiErrorResponse, ErrorType } from '../types';
import { JSON_HEADERS } from './success';

function isServiceUnavailableError(error: { code?: unknown; message?: string }) {
  return (
    error.code === 'ECONNREFUSED' ||
    error.code === 'ETIMEDOUT' ||
    error.message?.includes('service is unavailable') ||
    error.message?.includes('connect ECONNREFUSED')
  );
}

export function createErrorResponse(
  errorType: ErrorType = COMMON_ERROR.UNKNOWN,
  message?: string,
  errorDetail?: unknown,
  httpStatus?: number,
): NextResponse<ApiErrorResponse> {
  const status = httpStatus ?? 500;
  const body: ApiErrorResponse = {
    code: errorType.code,
    success: false,
    message: message || errorType.message,
    errorCode: errorType.code.toString(),
    errorDetail: process.env.NODE_ENV === 'development' ? errorDetail : undefined,
    data: null,
    timestamp: Date.now(),
  };

  return NextResponse.json(body, { status, headers: JSON_HEADERS });
}

export function createHttpErrorResponse(
  status = 500,
  message?: string,
  errorDetail?: unknown,
): NextResponse<ApiErrorResponse> {
  const code = HTTP_STATUS_TO_ERROR_CODE[status] ?? COMMON_ERROR.UNKNOWN.code;
  const found = Object.values(ERROR_CODES).find((err) => err.code === code);
  const errorType: ErrorType = found ?? COMMON_ERROR.UNKNOWN;

  return createErrorResponse(errorType, message, errorDetail, status);
}

export function createErrorResponseFromException(error: unknown): NextResponse<ApiErrorResponse> {
  const err = error as { code?: unknown; status?: unknown; message?: string };

  if (typeof err.status === 'number') {
    return createHttpErrorResponse(err.status, err.message, error);
  }

  if (isServiceUnavailableError(err)) {
    return createHttpErrorResponse(503, err.message, error);
  }

  if (typeof err.code === 'number') {
    const found = Object.values(ERROR_CODES).find((e) => e.code === err.code);

    if (found) {
      return createErrorResponse(
        found,
        err.message,
        error,
        typeof err.status === 'number' ? err.status : 500,
      );
    }
  }

  return createErrorResponse(COMMON_ERROR.SYSTEM_ERROR, err.message, error);
}
