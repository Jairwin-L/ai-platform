import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { assertByokRequestSecurity } from '@/lib/ai/security/request-security';
import { BYOK_SECURITY_KEY, type ByokSecurityOptions } from '@/common/decorators/metadata';

/**
 * BYOK 请求安全检查：生产环境只允许 HTTPS、限制请求体大小，写操作要求 JSON 与可信 Origin。
 *
 * 排在 SessionGuard 之前，与迁移前「先 assertByokRequestSecurity 再 requireByokUser」的顺序一致：
 * 来源不可信的请求不必再去查会话。
 */
@Injectable()
export class ByokRequestSecurityGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options =
      this.reflector.getAllAndOverride<ByokSecurityOptions>(BYOK_SECURITY_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? {};

    await assertByokRequestSecurity(context.switchToHttp().getRequest<Request>(), options);
    return true;
  }
}
