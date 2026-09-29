import { SetMetadata } from '@nestjs/common';
import type { SessionRealm } from '@/infra/session/session.service';
import type { RateLimitRule } from '@/infra/rate-limit/rate-limit.service';

export const REALM_KEY = 'auth:realm';
export const PERMISSIONS_KEY = 'auth:permissions';
export const ANY_PERMISSIONS_KEY = 'auth:any-permissions';
export const ALLOW_RESTRICTED_KEY = 'auth:allow-restricted';
export const RATE_LIMIT_KEY = 'rate-limit:rule';
export const BYOK_SECURITY_KEY = 'byok:security';
export const AUTH_OPTIONAL_KEY = 'auth:optional';

export interface ByokSecurityOptions {
  /** 要求 Content-Type: application/json */
  requireJson?: boolean;
  /** 要求 Origin 在系统设置的 BYOK 允许来源内，且不是跨站请求 */
  requireOrigin?: boolean;
}

/** 接口使用的会话域：platform 前台接口读 user 会话，管理后台接口读 admin 会话 */
export const Realm = (realm: SessionRealm) => SetMetadata(REALM_KEY, realm);
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
export const RequireAnyPermissions = (...permissions: string[]) =>
  SetMetadata(ANY_PERMISSIONS_KEY, permissions);
export const RateLimit = (rule: RateLimitRule) => SetMetadata(RATE_LIMIT_KEY, rule);
/** 会话可选：有有效会话时注入 request.user，没有时匿名放行 */
export const AuthOptional = () => SetMetadata(AUTH_OPTIONAL_KEY, true);
/** 受限的平台用户默认只能发只读请求，标注后放行该写接口（如重置密码） */
export const AllowRestricted = () => SetMetadata(ALLOW_RESTRICTED_KEY, true);
