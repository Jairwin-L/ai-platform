import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { Response } from 'express';
import { COMMON_ERROR, ERROR_CODES, HTTP_STATUS_TO_ERROR_CODE } from '@ai/constants/error-codes';
import { ApiException } from '../http/api-exception';
import { logger } from '@/infra/logger/logger';

/** Prisma 超时错误码：P1008 操作超时，P2024 连接池取连接超时 */
const PRISMA_TIMEOUT_CODES = new Set(['P1008', 'P2024']);

/**
 * 判断是否为超时类异常。超时的原始报错会带上调用栈和服务器文件路径，
 * 直接回传既泄露内部结构又对用户没有意义，单独识别出来换成固定文案。
 */
function isTimeoutError(error: { code?: unknown; message?: string; name?: string }) {
  if (typeof error.code === 'string' && PRISMA_TIMEOUT_CODES.has(error.code)) return true;
  if (error.code === 'ETIMEDOUT' || error.name === 'TimeoutError') return true;
  return /timed out|timeout|SocketTimeout/i.test(error.message ?? '');
}

function isServiceUnavailableError(error: { code?: unknown; message?: string; name?: string }) {
  return (
    error.code === 'ECONNREFUSED' ||
    error.name === 'ClientOfflineError' ||
    error.message?.includes('connect ECONNREFUSED')
  );
}

export function buildErrorBody(
  errorType: ErrorType,
  message?: string,
  errorDetail?: unknown,
  errorCode?: string,
): ApiErrorResponse {
  return {
    code: errorType.code,
    success: false,
    message: message || errorType.message,
    errorCode: errorCode ?? errorType.code,
    // 开发环境才回传细节：生产环境的底层报错可能带连接串片段与服务器路径
    errorDetail: process.env.NODE_ENV === 'development' ? errorDetail : undefined,
    data: null,
    timestamp: Date.now(),
  };
}

export function resolveErrorTypeByHttpStatus(status: number): ErrorType {
  const code = HTTP_STATUS_TO_ERROR_CODE[status] ?? COMMON_ERROR.UNKNOWN.code;
  return ERROR_CODES[code] ?? COMMON_ERROR.UNKNOWN;
}

/**
 * 异常自带的 message 是否可以回传给客户端：生产环境一律不回传，
 * 这类 message 来自底层库，对用户没有意义却会把内部结构暴露出去。
 */
function exposeMessage(message?: string): string | undefined {
  return process.env.NODE_ENV === 'production' ? undefined : message;
}

/**
 * 全局异常兜底：与迁移前 Next 版本 errorHandlerMiddleware 的映射规则保持一致。
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    // SSE 这类已经开始写出的响应不能再改状态码，只能记日志
    if (response.headersSent) {
      logger.error({ err: exception }, 'Unhandled API error after headers were sent');
      if (!response.writableEnded) response.end();
      return;
    }

    if (exception instanceof ApiException) {
      response
        .status(exception.getStatus())
        .json(
          buildErrorBody(
            exception.errorType,
            exception.message,
            exception.errorDetail,
            exception.publicErrorCode,
          ),
        );
      return;
    }

    logger.error({ err: exception }, 'Unhandled API error');

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      response
        .status(status)
        .json(
          buildErrorBody(
            resolveErrorTypeByHttpStatus(status),
            exposeMessage(exception.message),
            exception,
          ),
        );
      return;
    }

    const err = exception as { code?: unknown; status?: unknown; message?: string; name?: string };

    // 超时优先判定：这类异常往往同时带着 status/code，落到下面的分支就会把原始报错透出去
    if (isTimeoutError(err)) {
      response.status(504).json(buildErrorBody(COMMON_ERROR.TIMEOUT, undefined, exception));
      return;
    }

    if (typeof err.status === 'number' && err.status >= 400 && err.status <= 599) {
      response
        .status(err.status)
        .json(
          buildErrorBody(
            resolveErrorTypeByHttpStatus(err.status),
            exposeMessage(err.message),
            exception,
          ),
        );
      return;
    }

    if (isServiceUnavailableError(err)) {
      response
        .status(503)
        .json(
          buildErrorBody(COMMON_ERROR.SERVICE_UNAVAILABLE, exposeMessage(err.message), exception),
        );
      return;
    }

    response
      .status(500)
      .json(buildErrorBody(COMMON_ERROR.SYSTEM_ERROR, exposeMessage(err.message), exception));
  }
}
