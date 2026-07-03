declare namespace IServer {
  interface AuthUser {
    userId: string;
    email?: string;
    emailVerified?: boolean;
    nickName?: string;
    picture?: string;
    status?: string;
    roles?: string[];
    permissions?: string[];
  }

  interface AuthPayload {
    permissions: string[];
    roles: string[];
    user: IApiAuth.AuthUser;
  }

  interface ApiContext {
    params?: Promise<Record<string, string | string[]>>;
    user?: AuthUser;
    [key: string]: unknown;
  }

  type ApiMiddleware = (
    req: import('next/server').NextRequest,
    context: ApiContext,
    next: () => Promise<import('next/server').NextResponse>,
  ) => Promise<import('next/server').NextResponse>;

  type ApiHandler = (
    req: import('next/server').NextRequest,
    context: ApiContext,
  ) => Promise<import('next/server').NextResponse>;

  interface ErrorType {
    code: number;
    message: string;
  }

  interface ApiResponse<T = unknown> {
    code: number;
    success: boolean;
    message: string;
    data?: T | null;
    timestamp: number;
    errorCode?: string;
    errorDetail?: unknown;
  }

  interface PaginatedResponse<T = unknown>
    extends ApiResponse<{
      data: T[];
      total: number;
      page: number;
      pageSize: number;
    }> {}

  interface ApiErrorResponse extends ApiResponse<null> {
    errorCode: string;
    errorDetail?: unknown;
  }

  type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

  interface RouteParams {
    params?: Promise<Record<string, string | string[]>>;
  }

  interface CreateEmailUserInput {
    email: string;
    password: string;
  }

  type RedisArrayValue = Array<string | number | null>;
  type RedisValue = string | number | null | RedisArrayValue;

  type AuthCodePurpose = IApiAuth.AuthCodePurpose;

  interface StoredVerificationCode {
    attempts: number;
    codeHash: string;
    expiresAt: number;
  }

  interface ResendEmailResponse {
    error?: {
      message?: string;
      name?: string;
    };
    id?: string;
  }

  type SharpInstance = ReturnType<typeof import('sharp').default>;
  type SharpOutputType = 'jpeg' | 'png';
}
