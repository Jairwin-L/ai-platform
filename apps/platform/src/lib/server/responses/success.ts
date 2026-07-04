import { NextResponse } from 'next/server';
import type { ApiResponse, PaginatedResponse } from '../types';

interface SuccessResponseOptions {
  headers?: HeadersInit;
}

export const JSON_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function serialize<T>(payload: ApiResponse<T> | PaginatedResponse<unknown>) {
  return JSON.parse(
    JSON.stringify(payload, (key, value) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }

      if ((key === 'id' || key.endsWith('_id') || key.endsWith('Id')) && typeof value === 'number') {
        return value.toString();
      }

      return value;
    }),
  );
}

export function createSuccessResponse<T>(
  data: T,
  message = '操作成功',
  code = 200,
  options: SuccessResponseOptions = {},
): NextResponse<ApiResponse<T>> {
  const body: ApiResponse<T> = {
    code,
    success: true,
    message,
    data,
    timestamp: Date.now(),
  };

  return NextResponse.json(serialize(body), {
    status: code,
    headers: options.headers ?? JSON_HEADERS,
  });
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
  message = '查询成功',
): NextResponse<PaginatedResponse<T>> {
  const body: PaginatedResponse<T> = {
    code: 200,
    success: true,
    message,
    data: { data, total, page, pageSize },
    timestamp: Date.now(),
  };

  return NextResponse.json(serialize(body), { status: 200, headers: JSON_HEADERS });
}
