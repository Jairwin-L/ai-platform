/**
 * 请求异常。
 *
 * 服务端把业务 code 同步成了 HTTP 状态码，这里两者都保留：
 * 页面按 `code` / `errorCode` 做业务分支，401 重定向等链路按 `status` 判断。
 */
export class ApiError extends Error {
  readonly code: number;
  readonly status: number;
  readonly data?: unknown;
  readonly errorCode?: string;
  readonly errorDetail?: unknown;

  constructor(
    message: string,
    code = 500,
    status = code,
    data?: unknown,
    errorCode?: string,
    errorDetail?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.data = data;
    this.errorCode = errorCode;
    this.errorDetail = errorDetail;
  }
}
