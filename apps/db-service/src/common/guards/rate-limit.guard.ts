import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { COMMON_ERROR } from '@ai/constants/error-codes';
import {
  RateLimitService,
  getClientIp,
  type RateLimitRule,
} from '@/infra/rate-limit/rate-limit.service';
import { ApiException } from '@/common/http/api-exception';
import { RATE_LIMIT_KEY } from '@/common/decorators/metadata';
import type { AuthenticatedRequest } from '@/common/types/request';

/**
 * 按 IP 维度的固定窗口限流守卫。
 *
 * 邮箱等业务维度的二次限流留在各自的 service 里做——那需要先解析请求体。
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimit: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rule = this.reflector.getAllAndOverride<RateLimitRule>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!rule) return true;

    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const result = await this.rateLimit.consume(getClientIp(request), rule);

    if (!result.allowed) {
      http.getResponse<Response>().setHeader('Retry-After', String(result.retryAfterSeconds));
      throw new ApiException(
        COMMON_ERROR.RATE_LIMIT,
        `请求过于频繁，请 ${result.retryAfterSeconds} 秒后重试`,
        null,
        429,
      );
    }

    return true;
  }
}
