import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import { COMMON_ERROR, HTTP_STATUS_TO_ERROR_CODE } from '@ai/constants/error-codes';
import { BYOK_AUDIT_EVENT, BYOK_ERROR_CODE } from '@/lib/ai/byok/constants';
import { toByokPublicErrorFromException } from '@/lib/ai/byok/route-helpers';
import { toAiPublicErrorFromException } from '@/lib/ai/route-helpers';
import { writeByokAuditEvent } from '@/lib/ai/security/audit';
import { createRequestId, getRequestIp } from '@/lib/ai/security/request-security';
import { logger } from '@/infra/logger/logger';
import { buildErrorBody, resolveErrorTypeByHttpStatus } from './all-exceptions.filter';

function logUnexpected(exception: unknown, status: number, request: Request) {
  if (status >= 500) {
    logger.error({ err: exception, path: request.originalUrl }, '[byok] request failed');
  }
}

/**
 * BYOK 凭据接口的异常出口：错误码按 HTTP 状态归类，errorCode 透出 BYOK 业务码，
 * 与迁移前 createErrorResponse(getByokErrorResponseType(status), …, { errorCode }) 一致。
 * 安全响应头（no-store 等）由 NoStoreMiddleware 在请求进入时写好，错误响应同样带上。
 */
@Catch()
export class ByokExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const publicError = toByokPublicErrorFromException(exception);

    if (publicError.code === BYOK_ERROR_CODE.UNAUTHENTICATED) {
      writeByokAuditEvent({
        eventType: BYOK_AUDIT_EVENT.UNAUTHORIZED_ACCESS_ATTEMPT,
        requestId: createRequestId(request),
        ip: getRequestIp(request),
        result: 'blocked',
        reasonCode: BYOK_ERROR_CODE.UNAUTHENTICATED,
      });
    }
    logUnexpected(exception, publicError.status, request);

    if (response.headersSent) {
      if (!response.writableEnded) response.end();
      return;
    }

    // 映射表里没有的状态（如 499）归到通用请求错误，与迁移前 getByokErrorResponseType 一致
    const errorType = HTTP_STATUS_TO_ERROR_CODE[publicError.status]
      ? resolveErrorTypeByHttpStatus(publicError.status)
      : COMMON_ERROR.REQUEST_ERROR;
    response
      .status(publicError.status)
      .json(buildErrorBody(errorType, publicError.message, null, publicError.code));
  }
}

/**
 * AI 对话接口的异常出口：code 固定 COMMON_REQUEST_ERROR，errorCode 透出 AI 业务码，
 * 与迁移前 createAiErrorResponse 一致。
 */
@Catch()
export class AiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const publicError = toAiPublicErrorFromException(exception);

    logUnexpected(exception, publicError.status, request);

    if (response.headersSent) {
      if (!response.writableEnded) response.end();
      return;
    }

    response
      .status(publicError.status)
      .json(
        buildErrorBody(COMMON_ERROR.REQUEST_ERROR, publicError.message, null, publicError.code),
      );
  }
}
