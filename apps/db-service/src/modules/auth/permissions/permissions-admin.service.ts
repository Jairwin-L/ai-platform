import { Injectable } from '@nestjs/common';
import type { Permission, Prisma } from '@/generated/prisma/client';
import { AUTH_ERROR, COMMON_ERROR, ROLE_PERMISSION_ERROR } from '@ai/constants/error-codes';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { PermissionsService } from '@/infra/permissions/permissions.service';
import { ApiException } from '@/common/http/api-exception';
import { isSuperAdmin } from '@/common/utils/permission';
import { getSettledValue } from '@/common/utils/settled';
import { isUniqueConstraintError } from '@/common/utils/prisma-error';
import type { CreatePermissionInput, ListPermissionsQuery, UpdatePermissionInput } from './schemas';

interface PermissionNode extends Permission {
  children?: PermissionNode[];
}

function buildPermissionTree(permissions: Permission[]): PermissionNode[] {
  const nodes = new Map<string, PermissionNode>(
    permissions.map((permission) => [permission.id, { ...permission }]),
  );
  const roots: PermissionNode[] = [];

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

@Injectable()
export class PermissionsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionsCache: PermissionsService,
  ) {}

  async list(query: ListPermissionsQuery) {
    const { page, pageSize, skip, take, searchTerm, tree, type } = query;

    const where: Prisma.PermissionWhereInput = {
      ...(type ? { type } : {}),
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

    const [countResult, dataResult] = await Promise.allSettled([
      this.prisma.permission.count({ where }),
      this.prisma.permission.findMany({
        where,
        ...(tree ? {} : { skip, take }),
        orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }, { code: 'asc' }],
      }),
    ]);
    const total = getSettledValue(countResult);
    const permissions = getSettledValue(dataResult);

    return {
      data: tree ? buildPermissionTree(permissions) : permissions,
      total,
      page,
      pageSize: tree ? total : pageSize,
    };
  }

  private async assertParentExists(parentId: string): Promise<void> {
    const parent = await this.prisma.permission.findUnique({
      where: { id: parentId },
      select: { id: true },
    });
    if (!parent) {
      throw new ApiException(
        ROLE_PERMISSION_ERROR.PERMISSION_NOT_FOUND,
        '父级权限不存在',
        null,
        400,
      );
    }
  }

  async create(body: CreatePermissionInput) {
    if (body.parentId) await this.assertParentExists(body.parentId);

    try {
      const permission = await this.prisma.permission.create({ data: body });
      // 新增权限可能立即被授予，影响面无法按角色收敛，直接清空
      await this.permissionsCache.invalidateAllAuthCache();
      return permission;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ApiException(
          ROLE_PERMISSION_ERROR.PERMISSION_CODE_DUPLICATE,
          undefined,
          null,
          409,
        );
      }
      throw new ApiException(ROLE_PERMISSION_ERROR.PERMISSION_CREATE_FAILED, undefined, error, 500);
    }
  }

  async findOne(id: string) {
    const permission = await this.prisma.permission.findUnique({ where: { id } });
    if (!permission) {
      throw new ApiException(ROLE_PERMISSION_ERROR.PERMISSION_NOT_FOUND, undefined, null, 404);
    }
    return permission;
  }

  private async hasPermissionCycle(permissionId: string, parentId: string): Promise<boolean> {
    const permissions = await this.prisma.permission.findMany({
      select: { id: true, parentId: true },
    });
    const parentIds = new Map(
      permissions.map((permission) => [permission.id, permission.parentId]),
    );
    let currentId: string | null = parentId;
    let depth = 0;
    while (currentId && depth < 100) {
      if (currentId === permissionId) return true;
      currentId = parentIds.get(currentId) ?? null;
      depth += 1;
    }
    return depth === 100;
  }

  async update(id: string, body: UpdatePermissionInput, currentUser: AuthUser) {
    const permission = await this.findOne(id);

    // 权限码是接口鉴权的依据：非超管改码，等于把手里任意一个权限换成想要的权限
    if (body.code !== undefined && body.code !== permission.code && !isSuperAdmin(currentUser)) {
      throw new ApiException(AUTH_ERROR.FORBIDDEN, '只有超级管理员可以修改权限编码', null, 403);
    }

    const { parentId } = body;
    if (parentId === id) {
      throw new ApiException(COMMON_ERROR.PARAM_ERROR, '父级权限不能形成循环引用', null, 400);
    }
    if (parentId) {
      await this.assertParentExists(parentId);
      if (await this.hasPermissionCycle(id, parentId)) {
        throw new ApiException(COMMON_ERROR.PARAM_ERROR, '父级权限不能形成循环引用', null, 400);
      }
    }

    try {
      const updated = await this.prisma.permission.update({ where: { id }, data: body });
      // enable / code 变更会改变所有持有该权限的用户的权限码集合
      await this.permissionsCache.invalidateAllAuthCache();
      return updated;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ApiException(
          ROLE_PERMISSION_ERROR.PERMISSION_CODE_DUPLICATE,
          undefined,
          null,
          409,
        );
      }
      throw new ApiException(ROLE_PERMISSION_ERROR.PERMISSION_UPDATE_FAILED, undefined, error, 500);
    }
  }

  async remove(id: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
      select: { id: true, _count: { select: { children: true } } },
    });
    if (!permission) {
      throw new ApiException(ROLE_PERMISSION_ERROR.PERMISSION_NOT_FOUND, undefined, null, 404);
    }
    if (permission._count.children) {
      throw new ApiException(ROLE_PERMISSION_ERROR.PERMISSION_IN_USE, undefined, null, 409);
    }

    // role_permissions 在库里是 ON DELETE CASCADE，只删权限本身即可
    await this.prisma.permission.delete({ where: { id } });
    await this.permissionsCache.invalidateAllAuthCache();
    return { id };
  }
}
