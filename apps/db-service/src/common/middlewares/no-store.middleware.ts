import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { BYOK_SAFE_RESPONSE_HEADERS } from '@/lib/ai/byok/constants';

/**
 * 凭据与 AI 接口的安全响应头：禁止缓存、不带 Referrer。
 *
 * 放在中间件而不是拦截器里：拦截器只覆盖成功响应，鉴权失败、限流这些错误响应同样不能被缓存。
 */
@Injectable()
export class NoStoreMiddleware implements NestMiddleware {
  use(_request: Request, response: Response, next: NextFunction): void {
    for (const [name, value] of Object.entries(BYOK_SAFE_RESPONSE_HEADERS)) {
      response.setHeader(name, value);
    }
    next();
  }
}
