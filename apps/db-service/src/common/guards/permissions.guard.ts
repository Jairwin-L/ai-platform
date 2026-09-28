import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUTH_ERROR } from '@ai/constants/error-codes';
import { getMissingPermissionMessage } from '@ai/constants/permissions';
import { ApiException } from '@/common/http/api-exception';
import { PERMISSIONS_KEY } from '@/common/decorators/metadata';
import type { AuthenticatedRequest } from '@/common/types/request';

/**
 * 权限校验守卫：要求同时拥有全部权限码。
 *
 * 不给管理员角色做兜底放行：站点功能权限挂在 SITE_USER 上，与迁移前 requirePermission 的口径一致。
 * 提示文案走 getMissingPermissionMessage，不把内部权限编码直接暴露给前台。
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    if (required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!user) {
      throw new ApiException(AUTH_ERROR.UNAUTHORIZED, undefined, null, 401);
    }

    const missing = required.filter((code) => !user.permissions.includes(code));
    if (missing.length > 0) {
      throw new ApiException(AUTH_ERROR.FORBIDDEN, getMissingPermissionMessage(missing), null, 403);
    }

    return true;
  }
}
