import { HttpException } from '@nestjs/common';
import { ApiException } from '@/common/http/api-exception';
import { getFirstIssueMessage } from '@/common/utils/validation';
import { AiPublicError, toAiPublicError } from './errors';

/**
 * 把控制器链路上抛出的任意异常收敛成 AI 对话接口的对外错误。
 *
 * 迁移前 parseJsonBySchema 校验失败返回 422 + 第一条字段文案，鉴权失败返回 UNAUTHORIZED / FORBIDDEN；
 * 迁到 Nest 后这些检查由管道与守卫完成，这里按 HTTP 状态映射回原来的 AI 错误码。
 */
export function toAiPublicErrorFromException(exception: unknown): AiPublicError {
  if (exception instanceof AiPublicError) return exception;

  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const message = exception instanceof ApiException ? exception.message : undefined;

    if (status === 401) return new AiPublicError('UNAUTHORIZED', 401);
    if (status === 403) return new AiPublicError('FORBIDDEN', 403, message);
    if (status === 429) return new AiPublicError('RATE_LIMITED', 429);
    if (status === 400 || status === 413 || status === 422) {
      const issueMessage =
        exception instanceof ApiException ? getFirstIssueMessage(exception.errorDetail) : undefined;
      return new AiPublicError('INVALID_REQUEST', 422, issueMessage ?? '请求参数无效');
    }
  }

  return toAiPublicError(exception);
}
