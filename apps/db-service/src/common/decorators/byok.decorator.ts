import { SetMetadata, UseFilters, UseGuards, applyDecorators } from '@nestjs/common';
import { ApiCookieAuth } from '@nestjs/swagger';
import { SessionGuard } from '@/common/guards/session.guard';
import { ByokRequestSecurityGuard } from '@/common/guards/byok-request-security.guard';
import { AiExceptionFilter, ByokExceptionFilter } from '@/common/filters/byok-exception.filter';
import { BYOK_SECURITY_KEY, Realm, type ByokSecurityOptions } from './metadata';

/**
 * BYOK 凭据接口：安全检查 → 前台会话，错误响应按 BYOK 错误码输出。
 * 平台注册用户没有角色体系，登录即可管理自己的凭据；受限用户只能读取（见 SessionGuard）。
 *
 * 守卫必须在同一个 UseGuards 里按顺序声明：分开写多个装饰器时执行顺序取决于装饰器的求值顺序，
 * 容易被调整格式时意外打乱。
 */
export function ByokAuth(security: ByokSecurityOptions = {}) {
  return applyDecorators(
    Realm('user'),
    SetMetadata(BYOK_SECURITY_KEY, security),
    UseGuards(ByokRequestSecurityGuard, SessionGuard),
    UseFilters(ByokExceptionFilter),
    ApiCookieAuth('userSession'),
  );
}

/**
 * AI 对话与 AI 设置接口：前台会话，错误响应按 AI 错误码输出。
 */
export function AiAuth() {
  return applyDecorators(
    Realm('user'),
    UseGuards(SessionGuard),
    UseFilters(AiExceptionFilter),
    ApiCookieAuth('userSession'),
  );
}
