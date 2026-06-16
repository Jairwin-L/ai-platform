import type { NextRequest, NextResponse } from 'next/server';

export interface AuthUser {
  userId: string;
  email?: string;
  emailVerified?: boolean;
  nickName?: string;
  status?: string;
  roles?: string[];
  permissions?: string[];
}

export interface ApiContext {
  params?: Promise<Record<string, string | string[]>>;
  user?: AuthUser;
  [key: string]: unknown;
}

export type ApiMiddleware = (
  req: NextRequest,
  context: ApiContext,
  next: () => Promise<NextResponse>,
) => Promise<NextResponse>;

export type ApiHandler = (req: NextRequest, context: ApiContext) => Promise<NextResponse>;

export interface ErrorType {
  code: number;
  message: string;
}

export interface ApiResponse<T = unknown> {
  code: number;
  success: boolean;
  message: string;
  data?: T | null;
  timestamp: number;
  errorCode?: string;
  errorDetail?: unknown;
}

export interface PaginatedResponse<T = unknown>
  extends ApiResponse<{
    data: T[];
    total: number;
    page: number;
    pageSize: number;
  }> {}

export interface ApiErrorResponse extends ApiResponse<null> {
  errorCode: string;
  errorDetail?: unknown;
}

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface RouteParams {
  params?: Promise<Record<string, string | string[]>>;
}
