import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { logger } from '@/infra/logger/logger';
import { resolveClientIp } from '@/common/http/client-ip';
import { createRequestId } from '@/common/http/request-id';

function statusIcon(status: number) {
  if (status < 300) return '✅';
  if (status < 400) return '🔄';
  if (status < 500) return '⚠️';
  return '❌';
}

/**
 * 请求日志中间件：记录请求开始/结束、耗时与状态。
 *
 * 不记录查询参数与请求体：验证码、凭据相关接口的参数里可能出现敏感内容。
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const startTime = performance.now();
    const { method } = request;
    // 中间件挂在全局之下，request.path 会被 Express 剥掉挂载段，日志要完整路径
    const path = request.originalUrl.split('?')[0];
    const requestId = createRequestId();
    request.headers['x-request-id'] = requestId;

    logger.info(
      {
        requestId,
        method,
        path,
        ip: resolveClientIp(request) ?? 'unknown',
        userAgent: (request.headers['user-agent'] || 'unknown').slice(0, 100),
        type: 'request_start',
      },
      `🚀 ${method} ${path} - request start`,
    );

    response.setHeader('x-request-id', requestId);
    response.on('finish', () => {
      const duration = Math.round(performance.now() - startTime);
      logger.info(
        {
          requestId,
          method,
          path,
          status: response.statusCode,
          duration,
          type: 'request_complete',
        },
        `${statusIcon(response.statusCode)} ${method} ${path} - status: ${response.statusCode} | duration: ${duration}ms`,
      );
    });

    next();
  }
}
