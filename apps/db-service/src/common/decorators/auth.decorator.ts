import {
  UseGuards,
  applyDecorators,
  createParamDecorator,
  type ExecutionContext,
} from '@nestjs/common';
import { ApiCookieAuth } from '@nestjs/swagger';
import { SessionGuard } from '@/common/guards/session.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { AuthOptional, Realm, RequirePermissions } from './metadata';
import type { AuthenticatedRequest } from '@/common/types/request';

/**
 * platform 前台登录态接口：对应迁移前的 withAuthenticatedApiHandler。
 */
export function Auth() {
  return applyDecorators(Realm('user'), UseGuards(SessionGuard), ApiCookieAuth('userSession'));
}

/**
 * platform 前台公开接口：登录与否都能访问，有有效会话时注入当前用户。
 */
export function OptionalAuth() {
  return applyDecorators(Realm('user'), AuthOptional(), UseGuards(SessionGuard));
}

/**
 * platform 前台权限受控接口：对应迁移前的 withPermissionApiHandler(permissions, handler)。
 */
export function PermissionAuth(...permissions: string[]) {
  return applyDecorators(
    Realm('user'),
    RequirePermissions(...permissions),
    UseGuards(SessionGuard, PermissionsGuard),
    ApiCookieAuth('userSession'),
  );
}

/**
 * 管理后台接口：admin 会话 + 仍持有 SUPER_ADMIN / ADMIN 角色（由 SessionGuard 复核）。
 *
 * 迁移前这批接口（角色、权限、系统设置、AI Provider、第三方服务）大多没有任何鉴权，
 * 统一收口到这里，是管理端真正的安全边界；前端菜单显隐只是体验层面的收敛。
 */
export function AdminAuth() {
  return applyDecorators(Realm('admin'), UseGuards(SessionGuard), ApiCookieAuth('adminSession'));
}

/** 取当前登录用户 */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  return context.switchToHttp().getRequest<AuthenticatedRequest>().user;
});
