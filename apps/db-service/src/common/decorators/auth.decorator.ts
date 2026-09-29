import {
  UseGuards,
  applyDecorators,
  createParamDecorator,
  type ExecutionContext,
} from '@nestjs/common';
import { ApiCookieAuth } from '@nestjs/swagger';
import { SessionGuard } from '@/common/guards/session.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { AuthOptional, Realm, RequireAnyPermissions, RequirePermissions } from './metadata';
import type { AuthenticatedRequest } from '@/common/types/request';

/**
 * platform 前台登录态接口。平台注册用户没有角色体系，登录即可访问；
 * 受限用户只放行只读请求，写接口需要显式标注 @AllowRestricted()（见 SessionGuard）。
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
 * 管理端登录态接口：admin 会话 + 系统用户仍持有至少一个已启用的角色（由 SessionGuard 复核）。
 * 只用于不区分权限的接口（当前账号、菜单树等），业务接口一律用 AdminPermissionAuth。
 */
export function AdminAuth() {
  return applyDecorators(Realm('admin'), UseGuards(SessionGuard), ApiCookieAuth('adminSession'));
}

/**
 * 管理端权限受控接口：admin 会话 + 同时拥有全部权限码。
 *
 * 超级管理员直接放行；其余系统用户按角色授予的权限码判定。这是管理端真正的安全边界，
 * 前端的菜单与按钮显隐只是体验层面的收敛。
 */
export function AdminPermissionAuth(...permissions: string[]) {
  return applyDecorators(
    Realm('admin'),
    RequirePermissions(...permissions),
    UseGuards(SessionGuard, PermissionsGuard),
    ApiCookieAuth('adminSession'),
  );
}

/**
 * 管理端权限受控接口：拥有其中任一权限码即可。
 *
 * 用于被多个页面复用的只读接口，例如编辑角色时要拉整棵权限树，
 * 不能要求编辑者额外持有「查看菜单」。
 */
export function AdminAnyPermissionAuth(...permissions: string[]) {
  return applyDecorators(
    Realm('admin'),
    RequireAnyPermissions(...permissions),
    UseGuards(SessionGuard, PermissionsGuard),
    ApiCookieAuth('adminSession'),
  );
}

/** 取当前登录用户 */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  return context.switchToHttp().getRequest<AuthenticatedRequest>().user;
});
