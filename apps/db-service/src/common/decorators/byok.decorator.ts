import { SetMetadata, UseFilters, UseGuards, applyDecorators } from '@nestjs/common';
import { ApiCookieAuth } from '@nestjs/swagger';
import { SessionGuard } from '@/common/guards/session.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { ByokRequestSecurityGuard } from '@/common/guards/byok-request-security.guard';
import { AiExceptionFilter, ByokExceptionFilter } from '@/common/filters/byok-exception.filter';
import { BYOK_SECURITY_KEY, Realm, RequirePermissions, type ByokSecurityOptions } from './metadata';

/**
 * BYOK 凭据接口：安全检查 → 前台会话 → 权限码，错误响应按 BYOK 错误码输出。
 *
 * 守卫必须在同一个 UseGuards 里按顺序声明：分开写多个装饰器时执行顺序取决于装饰器的求值顺序，
 * 容易被调整格式时意外打乱。
 */
export function ByokAuth(permission?: string, security: ByokSecurityOptions = {}) {
  return applyDecorators(
    Realm('user'),
    SetMetadata(BYOK_SECURITY_KEY, security),
    RequirePermissions(...(permission ? [permission] : [])),
    UseGuards(ByokRequestSecurityGuard, SessionGuard, PermissionsGuard),
    UseFilters(ByokExceptionFilter),
    ApiCookieAuth('userSession'),
  );
}

/**
 * AI 对话接口：前台会话 → 权限码（默认 AI:CHAT:USE），错误响应按 AI 错误码输出。
 */
export function AiAuth(permission = 'AI:CHAT:USE') {
  return applyDecorators(
    Realm('user'),
    RequirePermissions(permission),
    UseGuards(SessionGuard, PermissionsGuard),
    UseFilters(AiExceptionFilter),
    ApiCookieAuth('userSession'),
  );
}
