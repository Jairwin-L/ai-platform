/**
 * 请求异常：业务 code 与 HTTP 状态分开保留，页面按 errorCode 做业务分支，
 * 401 跳转登录页等链路按 status 判断。
 */
export class ApiError extends Error {
  readonly status: number;
  readonly errorCode?: string;

  constructor(message: string, status = 500, errorCode?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorCode = errorCode;
  }
}
