import { Injectable } from '@nestjs/common';
import type { Permission, UserStatusType } from '@/generated/prisma/client';
import { ADMIN_ROLE_CODES } from '@ai/constants/roles';
import { PrismaService } from '@/infra/prisma/prisma.service';
import type { SessionRealm } from '@/infra/session/session.service';
import { getEffectiveStatusFields, recoverExpiredPlatformUsers } from './platform-user-status';

export interface PermissionResource extends Permission {
  children?: PermissionResource[];
}

export interface UserAuthSnapshot {
  roles: string[];
  permissions: string[];
  /** 用户账号状态；为 null 表示用户已不存在或已删除 */
  status: UserStatusType | null;
  /** 平台用户被限制 / 停用 / 封禁的原因；系统用户没有 */
  statusReason?: string | null;
  /** 平台用户受限 / 封禁的截止时间（ISO）；系统用户没有 */
  statusExpiresAt?: string | null;
  /** 能否进入管理端：系统用户存在且持有至少一个已启用的角色；平台用户恒为 false */
  canAccessAdmin: boolean;
}

const EMPTY_SNAPSHOT: UserAuthSnapshot = {
  roles: [],
  permissions: [],
  status: null,
  canAccessAdmin: false,
};

function buildPermissionTree(permissions: Permission[]): PermissionResource[] {
  const nodes = new Map<string, PermissionResource>(
    permissions.map((permission) => [permission.id, { ...permission }]),
  );
  const roots: PermissionResource[] = [];

  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      const parent = nodes.get(node.parentId)!;
      parent.children = [...(parent.children ?? []), node];
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export function isAdminRole(roles: string[]): boolean {
  return roles.some((role) => ADMIN_ROLE_CODES.includes(role as (typeof ADMIN_ROLE_CODES)[number]));
}

function getUserRoleCodes(userRoles: Array<{ role: { code: string } }>): string[] {
  return Array.from(new Set(userRoles.map((userRole) => userRole.role.code)));
}

/** 已启用角色的口径：enable 与 status 两个字段都要满足 */
const ENABLED_ROLE_WHERE = { enable: true, status: 'ENABLED' } as const;

@Injectable()
export class UserAuthQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async queryUserRolesAndPermissions(
    userId: string | undefined,
    realm: SessionRealm,
  ): Promise<UserAuthSnapshot> {
    if (!userId) return EMPTY_SNAPSHOT;

    // 平台用户与系统用户分表存放，平台用户没有角色体系，只需复核账号状态
    if (realm === 'user') {
      const user = await this.prisma.users.findUnique({
        where: { id: userId },
        select: { status: true, status_reason: true, status_expires_at: true, is_deleted: true },
      });
      if (!user || user.is_deleted) return EMPTY_SNAPSHOT;

      const effective = getEffectiveStatusFields(user);
      if (effective.status !== user.status) {
        await recoverExpiredPlatformUsers(this.prisma, { id: userId });
      }
      return { roles: [], permissions: [], ...effective, canAccessAdmin: false };
    }

    // 一次取回状态与角色权限：鉴权链路每个请求都要用，能少一次往返就少一次。
    // 任一查询失败都不能凭半份数据判定权限，直接抛出，由调用方回落或拒绝本次请求
    const [userResult, userRolesResult] = await Promise.allSettled([
      this.prisma.systemUser.findUnique({
        where: { id: userId },
        select: { status: true },
      }),
      this.prisma.userRole.findMany({
        where: { userId, role: ENABLED_ROLE_WHERE },
        select: {
          role: {
            select: {
              code: true,
              rolePermissions: {
                select: { permission: { select: { code: true, enable: true } } },
              },
            },
          },
        },
      }),
    ]);
    if (userResult.status === 'rejected') throw userResult.reason;
    if (userRolesResult.status === 'rejected') throw userRolesResult.reason;
    const user = userResult.value;
    const userRoles = userRolesResult.value;

    const status = user?.status ?? null;
    const roles = getUserRoleCodes(userRoles);
    // userRoles 已按角色启用状态过滤，角色全被停用或移除的系统用户同样进不了管理端
    const canAccessAdmin = Boolean(user) && userRoles.length > 0;
    if (isAdminRole(roles)) {
      const allPermissions = await this.prisma.permission.findMany({
        where: { enable: true },
        select: { code: true },
      });
      return {
        roles,
        permissions: allPermissions.map((permission) => permission.code),
        status,
        canAccessAdmin,
      };
    }

    const permissions = new Set<string>();
    for (const userRole of userRoles) {
      for (const rolePermission of userRole.role.rolePermissions) {
        if (rolePermission.permission.enable) {
          permissions.add(rolePermission.permission.code);
        }
      }
    }

    return { roles, permissions: Array.from(permissions), status, canAccessAdmin };
  }

  /**
   * 系统用户可见的已启用资源：角色直接授予的资源，再补齐它们的上级节点，
   * 否则只勾了按钮的角色在侧边栏里连所属菜单都看不到。
   */
  async queryUserPermissionResources(userId?: string): Promise<Permission[]> {
    if (!userId) return [];

    const [userRolesResult, resourcesResult] = await Promise.allSettled([
      this.prisma.userRole.findMany({
        where: { userId, role: ENABLED_ROLE_WHERE },
        select: {
          role: { select: { code: true, rolePermissions: { select: { permissionId: true } } } },
        },
      }),
      this.prisma.permission.findMany({
        where: { enable: true },
        orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }, { code: 'asc' }],
      }),
    ]);
    if (userRolesResult.status === 'rejected') throw userRolesResult.reason;
    if (resourcesResult.status === 'rejected') throw resourcesResult.reason;
    const userRoles = userRolesResult.value;
    const enabledResources = resourcesResult.value;

    if (isAdminRole(getUserRoleCodes(userRoles))) {
      return enabledResources;
    }

    const resourcesById = new Map(enabledResources.map((resource) => [resource.id, resource]));
    const permittedIds = new Set(
      userRoles.flatMap((userRole) =>
        userRole.role.rolePermissions
          .map((rolePermission) => rolePermission.permissionId)
          .filter((permissionId) => resourcesById.has(permissionId)),
      ),
    );

    for (const permissionId of Array.from(permittedIds)) {
      let current = resourcesById.get(permissionId);
      let depth = 0;
      while (current?.parentId && depth < 100) {
        permittedIds.add(current.parentId);
        current = resourcesById.get(current.parentId);
        depth += 1;
      }
    }

    return enabledResources.filter((resource) => permittedIds.has(resource.id));
  }

  async queryUserPermissionTree(userId?: string): Promise<PermissionResource[]> {
    const resources = await this.queryUserPermissionResources(userId);
    return buildPermissionTree(resources);
  }
}
