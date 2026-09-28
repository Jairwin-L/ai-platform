import { Injectable } from '@nestjs/common';
import type { UserStatusType } from '@/generated/prisma/client';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { getActiveUserRoleWhere, isAdminRole } from './user-roles';

export interface UserAuthSnapshot {
  roles: string[];
  permissions: string[];
  /** 用户账号状态；为 null 表示用户不存在或已删除 */
  status: UserStatusType | null;
  /** 能否进入管理后台：持有有效的 SUPER_ADMIN / ADMIN 角色 */
  canAccessAdmin: boolean;
}

const EMPTY_SNAPSHOT: UserAuthSnapshot = {
  roles: [],
  permissions: [],
  status: null,
  canAccessAdmin: false,
};

@Injectable()
export class UserAuthQueryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 查询用户的有效角色与权限码。
   *
   * 前台与后台是同一张 users 表，差别只在于能否进入后台：canAccessAdmin 由管理员角色决定。
   * 权限码只来自角色授权，不给管理员角色做全量兜底——迁移前的行为即如此：
   * 站点功能权限挂在 SITE_USER 上，管理员角色刻意不持有站点权限。
   */
  async queryUserRolesAndPermissions(userId: string | undefined): Promise<UserAuthSnapshot> {
    if (!userId) return EMPTY_SNAPSHOT;

    // 任一查询失败都不能凭半份数据判定权限，直接抛出，由调用方回落或拒绝本次请求
    const [userResult, userRolesResult] = await Promise.allSettled([
      this.prisma.users.findUnique({
        where: { id: userId },
        select: { status: true, is_deleted: true },
      }),
      this.prisma.userRoles.findMany({
        where: { user_id: userId, ...getActiveUserRoleWhere() },
        select: {
          role: {
            select: {
              code: true,
              role_permissions: { select: { permission: { select: { code: true } } } },
            },
          },
        },
      }),
    ]);
    if (userResult.status === 'rejected') throw userResult.reason;
    if (userRolesResult.status === 'rejected') throw userRolesResult.reason;

    const user = userResult.value;
    if (!user || user.is_deleted) return EMPTY_SNAPSHOT;

    const roles = new Set<string>();
    const permissions = new Set<string>();
    for (const userRole of userRolesResult.value) {
      roles.add(userRole.role.code);
      for (const rolePermission of userRole.role.role_permissions) {
        permissions.add(rolePermission.permission.code);
      }
    }

    const roleCodes = Array.from(roles);
    return {
      roles: roleCodes,
      permissions: Array.from(permissions),
      status: user.status,
      canAccessAdmin: isAdminRole(roleCodes),
    };
  }
}
