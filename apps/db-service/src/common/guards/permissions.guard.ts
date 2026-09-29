import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUTH_ERROR } from '@ai/constants/error-codes';
import { ApiException } from '@/common/http/api-exception';
import { ANY_PERMISSIONS_KEY, PERMISSIONS_KEY } from '@/common/decorators/metadata';
import { assertAnyPermission, assertPermissions } from '@/common/utils/permission';
import type { AuthenticatedRequest } from '@/common/types/request';

/**
 * 管理端权限校验守卫：
 * - `RequirePermissions` 要求同时拥有全部权限码；
 * - `RequireAnyPermissions` 要求至少拥有其中一个。
 *
 * 超级管理员直接放行：它的权限集合只含已启用的资源，停用某个按钮资源不应把超管自己锁在门外。
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, targets) ?? [];
    const anyOf = this.reflector.getAllAndOverride<string[]>(ANY_PERMISSIONS_KEY, targets) ?? [];
    if (required.length === 0 && anyOf.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!user) {
      throw new ApiException(AUTH_ERROR.UNAUTHORIZED, undefined, null, 401);
    }

    assertPermissions(user, required);
    assertAnyPermission(user, anyOf);

    return true;
  }
}
