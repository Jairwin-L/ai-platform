import { HttpException } from '@nestjs/common';
import { COMMON_ERROR } from '@ai/constants/error-codes';

interface ApiExceptionOptions {
  /**
   * 覆盖响应体里的 errorCode。
   *
   * 默认与 errorType.code 相同；BYOK / AI 接口要把更细的业务码（如 RATE_LIMITED、
   * BYOK_KEY_INVALID）透给前端，同时 code 仍按 HTTP 状态归类，与迁移前的响应结构一致。
   */
  errorCode?: string;
}

/**
 * 业务异常：携带项目自有的错误码常量，由 AllExceptionsFilter 转成统一错误响应。
 *
 * 与迁移前 Next 版本的 createErrorResponse(errorType, message, detail, status) 一一对应。
 */
export class ApiException extends HttpException {
  readonly errorType: ErrorType;
  readonly errorDetail: unknown;
  readonly publicErrorCode: string;

  constructor(
    errorType: ErrorType = COMMON_ERROR.UNKNOWN,
    message?: string,
    errorDetail?: unknown,
    httpStatus = 500,
    options: ApiExceptionOptions = {},
  ) {
    super(message || errorType.message, httpStatus);
    this.errorType = errorType;
    this.errorDetail = errorDetail;
    this.publicErrorCode = options.errorCode ?? errorType.code;
  }
}
