import { Injectable } from '@nestjs/common';
import type { Prisma } from '@/generated/prisma/client';
import { PERMISSION_CODE } from '@ai/constants/permissions';
import { RoleCode } from '@ai/constants/roles';
import { COMMON_ERROR, ROLE_PERMISSION_ERROR, USER_ERROR } from '@ai/constants/error-codes';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { PermissionsService } from '@/infra/permissions/permissions.service';
import { logger } from '@/infra/logger/logger';
import { ApiException } from '@/common/http/api-exception';
import { assertGrantable, assertPermissions } from '@/common/utils/permission';
import { getSettledValue } from '@/common/utils/settled';
import type {
  CreateRoleInput,
  PageQueryRolesQuery,
  QueryRolesQuery,
  SetRoleUserInput,
  UpdateRoleInput,
} from './schemas';

const { ROLE } = PERMISSION_CODE.OPERATION;

const roleInclude = {
  rolePermissions: { select: { permission: { select: { id: true, code: true, name: true } } } },
  _count: { select: { userRoles: true } },
} satisfies Prisma.RoleInclude;

type RoleWithRelations = Prisma.RoleGetPayload<{ include: typeof roleInclude }>;

function serializeRole(role: RoleWithRelations) {
  return {
    id: role.id,
    code: role.code,
    name: role.name,
    description: role.description ?? role.remark,
    remark: role.remark,
    enable: role.enable,
    status: role.status,
    isSystem: role.isSystem,
    permissions: role.rolePermissions.map((rolePermission) => rolePermission.permission),
    userCount: role._count.userRoles,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
}

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionsCache: PermissionsService,
  ) {}

  async list() {
    const roles = await this.prisma.role.findMany({
      include: roleInclude,
      orderBy: { createdAt: 'asc' },
    });
    return roles.map(serializeRole);
  }

  async pageQueryList(query: PageQueryRolesQuery) {
    const { page, pageSize, skip, take, searchTerm, enable } = query;

    const where: Prisma.RoleWhereInput = {
      ...(enable === undefined ? {} : { enable }),
      ...(searchTerm
        ? {
            OR: [
              { name: { contains: searchTerm, mode: 'insensitive' } },
              { code: { contains: searchTerm, mode: 'insensitive' } },
              { description: { contains: searchTerm, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [countResult, rolesResult] = await Promise.allSettled([
      this.prisma.role.count({ where }),
      this.prisma.role.findMany({
        where,
        skip,
        take,
        include: roleInclude,
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return {
      data: getSettledValue(rolesResult).map(serializeRole),
      total: getSettledValue(countResult),
      page,
      pageSize,
    };
  }

  async queryList(query: QueryRolesQuery) {
    const { enable } = query;
    return this.prisma.role.findMany({
      where: enable === undefined ? {} : { enable },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        remark: true,
        enable: true,
        isSystem: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async queryRoleUserList(id: string) {
    const role = await this.prisma.role.findUnique({ where: { id }, select: { id: true } });
    if (!role) {
      throw new ApiException(ROLE_PERMISSION_ERROR.ROLE_NOT_FOUND, undefined, null, 404);
    }

    return this.prisma.systemUser.findMany({
      where: { userRoles: { some: { roleId: id } } },
      select: {
        id: true,
        account: true,
        username: true,
        nickname: true,
        avatar: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** 校验权限 id 全部存在，返回对应的权限码 */
  private async getPermissionCodes(permissionIds: string[]): Promise<Map<string, string>> {
    if (permissionIds.length === 0) return new Map();

    const permissions = await this.prisma.permission.findMany({
      where: { id: { in: permissionIds } },
      select: { id: true, code: true },
    });
    if (permissions.length !== permissionIds.length) {
      throw new ApiException(
        ROLE_PERMISSION_ERROR.PERMISSION_NOT_FOUND,
        '部分权限不存在',
        null,
        400,
      );
    }
    return new Map(permissions.map((permission) => [permission.id, permission.code]));
  }

  async create(body: CreateRoleInput, currentUser: AuthUser) {
    const { code, description, enable, name, permissionIds, remark } = body;

    const permissionCodes = await this.getPermissionCodes(permissionIds);
    assertGrantable(
      await this.permissionsCache.findUngrantablePermissionCodes(
        currentUser,
        Array.from(permissionCodes.values()),
      ),
    );

    const existing = await this.prisma.role.findFirst({
      where: { OR: [{ name }, { code }] },
      select: { id: true },
    });
    if (existing) {
      throw new ApiException(ROLE_PERMISSION_ERROR.ROLE_NAME_DUPLICATE, undefined, null, 409);
    }

    const role = await this.prisma.role.create({
      data: {
        code,
        name,
        description: description || remark || null,
        remark: remark || description || null,
        enable,
        status: enable ? 'ENABLED' : 'DISABLED',
        rolePermissions: permissionIds.length
          ? { create: permissionIds.map((permissionId) => ({ permissionId })) }
          : undefined,
      },
      include: roleInclude,
    });

    return serializeRole(role);
  }

  async update(body: UpdateRoleInput, currentUser: AuthUser) {
    const { id, code, enable, name, description, permissionIds, remark } = body;

    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new ApiException(ROLE_PERMISSION_ERROR.ROLE_NOT_FOUND, undefined, null, 404);
    }

    // 编辑资料与启停共用这个接口：按实际变更分别要求权限，列表页的启停开关只需要 ROLE_SET_STATE
    if (enable !== undefined && enable !== role.enable) {
      assertPermissions(currentUser, [ROLE.SET_STATE]);
    }
    const editsProfile = [name, code, description, remark, permissionIds].some(
      (value) => value !== undefined,
    );
    if (editsProfile) {
      assertPermissions(currentUser, [ROLE.EDIT]);
    }

    // 角色编码参与鉴权（超级管理员靠它识别），一经设置不允许修改：
    // 否则可以先改掉 SUPER_ADMIN 角色的编码，再把自己所在角色改成 SUPER_ADMIN
    if (code && code !== role.code) {
      throw new ApiException(COMMON_ERROR.PARAM_ERROR, '角色编码创建后不可修改', null, 400);
    }

    if (name && name !== role.name) {
      const duplicate = await this.prisma.role.findFirst({
        where: { id: { not: id }, name },
        select: { id: true },
      });
      if (duplicate) {
        throw new ApiException(ROLE_PERMISSION_ERROR.ROLE_NAME_DUPLICATE, undefined, null, 409);
      }
    }

    if (role.code === RoleCode.SUPER_ADMIN && enable === false) {
      throw new ApiException(
        ROLE_PERMISSION_ERROR.ROLE_BUILTIN,
        '超级管理员角色不能停用',
        null,
        403,
      );
    }

    if (permissionIds) {
      // 越权校验要同时用到两份数据，任一查询失败都不能继续往下改权限
      const [permissionCodesResult, currentRolePermissionsResult] = await Promise.allSettled([
        this.getPermissionCodes(permissionIds),
        this.prisma.rolePermission.findMany({
          where: { roleId: id },
          select: { permissionId: true },
        }),
      ]);
      const permissionCodes = getSettledValue(permissionCodesResult);
      const currentPermissionIds = new Set(
        getSettledValue(currentRolePermissionsResult).map(
          (rolePermission) => rolePermission.permissionId,
        ),
      );

      // 只校验这次新增的权限：角色原有、但编辑者自己没有的权限原样保留不算越权
      assertGrantable(
        await this.permissionsCache.findUngrantablePermissionCodes(
          currentUser,
          Array.from(permissionCodes.entries())
            .filter(([permissionId]) => !currentPermissionIds.has(permissionId))
            .map(([, permissionCode]) => permissionCode),
        ),
      );
    }

    let status: 'ENABLED' | 'DISABLED' | undefined;
    if (enable !== undefined) status = enable ? 'ENABLED' : 'DISABLED';

    const updated = await this.prisma.$transaction(async (tx) => {
      if (permissionIds) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        if (permissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
          });
        }
      }

      return tx.role.update({
        where: { id },
        data: {
          name: name || undefined,
          description: description === undefined ? undefined : description || remark || null,
          remark: remark === undefined ? undefined : remark || description || null,
          enable,
          status,
        },
        include: roleInclude,
      });
    });

    // 角色的权限集合或启停状态变了，该角色下所有用户的缓存都要作废
    await this.permissionsCache.invalidateRoleAuthCache(id);

    return serializeRole(updated);
  }

  async remove(roleId: string): Promise<null> {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { code: true },
    });
    if (!role) {
      throw new ApiException(ROLE_PERMISSION_ERROR.ROLE_NOT_FOUND, undefined, null, 404);
    }
    if (role.code === RoleCode.SUPER_ADMIN) {
      throw new ApiException(
        ROLE_PERMISSION_ERROR.ROLE_BUILTIN,
        '超级管理员角色不能删除',
        null,
        403,
      );
    }

    // 删除前先失效缓存：删完就查不到该角色下有哪些用户了
    await this.permissionsCache.invalidateRoleAuthCache(roleId);
    // role_permissions / user_roles 在库里是 ON DELETE CASCADE，只删角色本身即可
    await this.prisma.role.delete({ where: { id: roleId } });

    return null;
  }

  async setRoleUser(body: SetRoleUserInput, currentUser: AuthUser) {
    const { roleId, userIds } = body;

    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { code: true },
    });
    if (!role) {
      throw new ApiException(ROLE_PERMISSION_ERROR.ROLE_NOT_FOUND, undefined, null, 404);
    }
    if (role.code === RoleCode.SUPER_ADMIN) {
      throw new ApiException(
        ROLE_PERMISSION_ERROR.ROLE_BUILTIN,
        '超级管理员角色的用户只能通过 bootstrap 配置',
        null,
        403,
      );
    }
    if (userIds.length > 0) {
      // 只在系统用户表里找：平台用户的 id 在这里查不到，天然挂不上系统角色
      const count = await this.prisma.systemUser.count({ where: { id: { in: userIds } } });
      if (count !== userIds.length) {
        throw new ApiException(USER_ERROR.NOT_FOUND, '部分用户不存在', null, 400);
      }
    }

    const currentUserRoles = await this.prisma.userRole.findMany({
      where: { roleId },
      select: { userId: true },
    });
    const currentUserIds = new Set(currentUserRoles.map((userRole) => userRole.userId));
    const nextUserIds = new Set(userIds);
    const toRemove = Array.from(currentUserIds).filter((userId) => !nextUserIds.has(userId));
    const toAdd = userIds.filter((userId) => !currentUserIds.has(userId));

    // 往角色里加人等于把角色的全部权限授给对方，同样不能超出操作者自己的权限
    if (toAdd.length > 0) {
      // 超管的角色只认 bootstrap，这里不补校验就能从角色侧绕开用户侧的同名限制
      const superAdminCount = await this.prisma.systemUser.count({
        where: {
          id: { in: toAdd },
          userRoles: { some: { role: { code: RoleCode.SUPER_ADMIN } } },
        },
      });
      if (superAdminCount > 0) {
        throw new ApiException(
          ROLE_PERMISSION_ERROR.ROLE_BUILTIN,
          '超级管理员用户的角色不能手动修改',
          null,
          403,
        );
      }
      assertGrantable(
        await this.permissionsCache.findUngrantableRolePermissionCodes(currentUser, [roleId]),
      );
    }

    await this.prisma.$transaction(async (tx) => {
      if (toRemove.length > 0) {
        await tx.userRole.deleteMany({ where: { roleId, userId: { in: toRemove } } });
      }
      if (toAdd.length > 0) {
        await tx.userRole.createMany({
          data: toAdd.map((userId) => ({ roleId, userId })),
          skipDuplicates: true,
        });
      }
    });

    // 新增和移除的用户权限都变了，逐个失效。成员变更已经提交，个别失效失败不回滚，
    // 只记日志：该用户的旧权限最长保留一个缓存 TTL（5 分钟）
    const changedUserIds = [...toRemove, ...toAdd];
    const invalidations = await Promise.allSettled(
      changedUserIds.map((userId) => this.permissionsCache.invalidateUserAuthCache(userId)),
    );
    invalidations.forEach((result, index) => {
      if (result.status === 'rejected') {
        logger.warn(
          { error: result.reason, userId: changedUserIds[index] },
          '[roles] 角色成员变更后失效权限缓存失败',
        );
      }
    });

    const updated = await this.prisma.userRole.findMany({
      where: { roleId },
      select: { userId: true },
    });
    return { roleId, userIds: updated.map((userRole) => userRole.userId) };
  }
}
