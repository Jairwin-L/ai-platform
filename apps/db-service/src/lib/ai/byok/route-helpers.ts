import { HttpException } from '@nestjs/common';
import { ApiException } from '@/common/http/api-exception';
import { BYOK_ERROR_CODE } from './constants';
import { ByokPublicError, toByokPublicError } from './errors';

/**
 * 把控制器链路上抛出的任意异常收敛成 BYOK 对外错误。
 *
 * 迁移前每个 BYOK 路由自己 try/catch，鉴权失败、限流、参数错误都会落成 ByokPublicError；
 * 迁到 Nest 后这些检查由守卫和管道完成，抛出的是通用 ApiException，这里按 HTTP 状态映射回
 * 原来的 BYOK 错误码与文案，前端看到的 errorCode 不变。未知异常一律 INTERNAL_ERROR，不透出细节。
 */
export function toByokPublicErrorFromException(exception: unknown): ByokPublicError {
  if (exception instanceof ByokPublicError) return exception;

  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const message = exception instanceof ApiException ? exception.message : undefined;

    if (status === 401) return new ByokPublicError(BYOK_ERROR_CODE.UNAUTHENTICATED, 401);
    if (status === 403) return new ByokPublicError(BYOK_ERROR_CODE.FORBIDDEN, 403, message);
    if (status === 429) return new ByokPublicError(BYOK_ERROR_CODE.RATE_LIMITED, 429);
    if (status === 413) {
      return new ByokPublicError(BYOK_ERROR_CODE.INVALID_REQUEST, 413, '请求体超出限制。');
    }
    if (status === 400 || status === 422) {
      return new ByokPublicError(BYOK_ERROR_CODE.INVALID_REQUEST, 400, '请求参数无效。');
    }
  }

  return toByokPublicError(exception);
}
