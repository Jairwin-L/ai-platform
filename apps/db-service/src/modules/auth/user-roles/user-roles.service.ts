import { Injectable } from '@nestjs/common';
import { RoleCode } from '@ai/constants/roles';
import { ROLE_PERMISSION_ERROR, USER_ERROR } from '@ai/constants/error-codes';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { ID_PREFIX, createId } from '@/lib/id';
import { PermissionsService } from '@/infra/permissions/permissions.service';
import { ApiException } from '@/common/http/api-exception';
import { assertGrantable } from '@/common/utils/permission';
import type { UpdateUserRolesInput } from './schemas';

const userRoleSelect = { role: { select: { code: true, id: true, name: true } } } as const;

@Injectable()
export class UserRolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionsCache: PermissionsService,
  ) {}

  async queryUserRoles(userId: string) {
    const user = await this.prisma.systemUser.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new ApiException(USER_ERROR.NOT_FOUND, undefined, null, 404);
    }

    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      select: userRoleSelect,
      orderBy: { createdAt: 'asc' },
    });
    return { userId, roles: userRoles.map((userRole) => userRole.role) };
  }

  async updateUserRoles(body: UpdateUserRolesInput, currentUser: AuthUser) {
    const { userId, roleIds } = body;

    // 只在系统用户表里找：平台用户的 id 在这里查不到，天然挂不上系统角色
    const user = await this.prisma.systemUser.findUnique({
      where: { id: userId },
      select: { userRoles: { select: { roleId: true, role: { select: { code: true } } } } },
    });
    if (!user) {
      throw new ApiException(USER_ERROR.NOT_FOUND, undefined, null, 404);
    }
    if (user.userRoles.some((userRole) => userRole.role.code === RoleCode.SUPER_ADMIN)) {
      throw new ApiException(
        ROLE_PERMISSION_ERROR.ROLE_BUILTIN,
        '超级管理员角色只能通过 bootstrap 配置修改',
        null,
        403,
      );
    }

    const roles = await this.prisma.role.findMany({
      where: { id: { in: roleIds } },
      select: { code: true },
    });
    if (roles.length !== roleIds.length) {
      throw new ApiException(ROLE_PERMISSION_ERROR.ROLE_NOT_FOUND, '部分角色不存在', null, 400);
    }
    if (roles.some((role) => role.code === RoleCode.SUPER_ADMIN)) {
      throw new ApiException(
        ROLE_PERMISSION_ERROR.ROLE_BUILTIN,
        '超级管理员角色只能通过 bootstrap 配置分配',
        null,
        403,
      );
    }

    // 只校验新加的角色：分配角色等于授出角色的全部权限，不能超出操作者自己的权限
    const currentRoleIds = new Set(user.userRoles.map((userRole) => userRole.roleId));
    assertGrantable(
      await this.permissionsCache.findUngrantableRolePermissionCodes(
        currentUser,
        roleIds.filter((roleId) => !currentRoleIds.has(roleId)),
      ),
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId } });
      if (roleIds.length > 0) {
        await tx.userRole.createMany({
          data: roleIds.map((roleId) => ({ id: createId(ID_PREFIX.userRole), userId, roleId })),
        });
      }
    });

    await this.permissionsCache.invalidateUserAuthCache(userId);

    return this.queryUserRoles(userId);
  }
}
