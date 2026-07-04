import { NextResponse } from 'next/server';
import { COMMON_ERROR } from '@/constants/error-codes';
import type { ApiErrorResponse, ErrorType } from '../types';
import { JSON_HEADERS } from './success';

export interface ErrorResponseOptions {
  errorCode?: string;
  headers?: HeadersInit;
}

export function createErrorResponse(
  errorType: ErrorType = COMMON_ERROR.UNKNOWN,
  message?: string,
  errorDetail?: unknown,
  httpStatus?: number,
  options: ErrorResponseOptions = {},
): NextResponse<ApiErrorResponse> {
  const status = httpStatus ?? 500;
  const body: ApiErrorResponse = {
    code: errorType.code,
    success: false,
    message: message || errorType.message,
    errorCode: options.errorCode ?? errorType.code,
    errorDetail: process.env.NODE_ENV === 'development' ? errorDetail : undefined,
    data: null,
    timestamp: Date.now(),
  };

  return NextResponse.json(body, { status, headers: options.headers ?? JSON_HEADERS });
}
