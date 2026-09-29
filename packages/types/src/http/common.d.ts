declare namespace IHttpCommon {
  /** db-service 的统一响应体（ResponseInterceptor / AllExceptionsFilter 组装） */
  interface ApiResponse<T = unknown> {
    code: number;
    success: boolean;
    message: string;
    data?: T | null;
    timestamp: number;
    errorCode?: string;
    errorDetail?: unknown;
  }

  interface PaginatedData<T> {
    data: T[];
    page: number;
    pageSize: number;
    total: number;
  }
}
