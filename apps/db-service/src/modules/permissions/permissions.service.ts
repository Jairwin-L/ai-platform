import { Injectable } from '@nestjs/common';
import type { Permissions, Prisma } from '@/generated/prisma/client';
import { COMMON_ERROR, DATA_ERROR } from '@ai/constants/error-codes';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { PermissionsService as PermissionsCacheService } from '@/infra/permissions/permissions.service';
import { ApiException } from '@/common/http/api-exception';
import { getSettledValue } from '@/common/utils/settled';
import { isRecordNotFoundError, isUniqueConstraintError } from '@/common/utils/prisma-error';
import type { CreatePermissionInput, ListPermissionsQuery, UpdatePermissionInput } from './schemas';

/** 权限 id / parent_id 是自增整数，接口统一按字符串返回，与迁移前的响应保持一致 */
interface PermissionNode extends Omit<Permissions, 'id' | 'parent_id'> {
  id: string;
  parent_id: string | null;
  children?: PermissionNode[];
}

function serializePermission(permission: Permissions): PermissionNode {
  return {
    ...permission,
    id: permission.id.toString(),
    parent_id: permission.parent_id ? permission.parent_id.toString() : null,
  };
}

function buildPermissionTree(permissions: PermissionNode[]): PermissionNode[] {
  const nodeMap = new Map<string, PermissionNode>();
  const roots: PermissionNode[] = [];

  for (const permission of permissions) {
    nodeMap.set(permission.id, { ...permission, children: [] });
  }
  for (const permission of permissions) {
    const node = nodeMap.get(permission.id)!;
    if (permission.parent_id && nodeMap.has(permission.parent_id)) {
      nodeMap.get(permission.parent_id)!.children!.push(node);
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
    private readonly permissionsCache: PermissionsCacheService,
  ) {}

  async list(query: ListPermissionsQuery) {
    const { page, pageSize, skip, take, searchTerm, tree, type } = query;
    const where: Prisma.PermissionsWhereInput = {
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

    const [totalResult, permissionsResult] = await Promise.allSettled([
      this.prisma.permissions.count({ where }),
      this.prisma.permissions.findMany({
        where,
        // 树形结构必须拿全量节点才能拼出来，分页只作用于平铺列表
        ...(tree ? {} : { skip, take }),
        orderBy: { id: 'asc' },
      }),
    ]);
    const total = getSettledValue(totalResult);
    const permissions = getSettledValue(permissionsResult).map(serializePermission);

    return {
      data: tree ? buildPermissionTree(permissions) : permissions,
      total,
      page,
      pageSize: tree ? total : pageSize,
    };
  }

  async findOne(id: number) {
    const permission = await this.prisma.permissions.findUnique({ where: { id } });
    if (!permission) {
      throw new ApiException(DATA_ERROR.NOT_FOUND, '权限不存在', null, 404);
    }
    return serializePermission(permission);
  }

  private async assertParent(parentId: number | null | undefined, selfId?: number): Promise<void> {
    if (!parentId) return;
    if (parentId === selfId) {
      throw new ApiException(COMMON_ERROR.PARAM_ERROR, '上级权限不能是自己', null, 400);
    }

    const permissions = await this.prisma.permissions.findMany({
      select: { id: true, parent_id: true },
    });
    const parentIds = new Map(permissions.map((item) => [item.id, item.parent_id]));
    if (!parentIds.has(parentId)) {
      throw new ApiException(DATA_ERROR.VALIDATION_FAILED, '上级权限不存在', null, 422);
    }

    // 沿着新上级往上走，碰到自己就是循环引用
    if (selfId !== undefined) {
      let currentId: number | null | undefined = parentId;
      let depth = 0;
      while (currentId && depth < 100) {
        if (currentId === selfId) {
          throw new ApiException(COMMON_ERROR.PARAM_ERROR, '上级权限不能形成循环引用', null, 400);
        }
        currentId = parentIds.get(currentId);
        depth += 1;
      }
    }
  }

  async create(body: CreatePermissionInput) {
    await this.assertParent(body.parent_id);

    try {
      const permission = await this.prisma.permissions.create({
        data: {
          name: body.name,
          code: body.code,
          type: body.type,
          description: body.description ?? null,
          parent_id: body.parent_id ?? null,
        },
      });
      return serializePermission(permission);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ApiException(DATA_ERROR.DUPLICATE_ENTRY, '权限编码必须唯一', null, 409);
      }
      throw new ApiException(DATA_ERROR.CREATE_FAILED, '权限创建失败', error, 500);
    }
  }

  async update(id: number, body: UpdatePermissionInput) {
    await this.assertParent(body.parent_id, id);

    try {
      const permission = await this.prisma.permissions.update({
        where: { id },
        data: {
          name: body.name,
          code: body.code,
          type: body.type,
          description: body.description,
          parent_id: body.parent_id,
          updated_at: new Date(),
        },
      });
      // 权限编码变化会改变所有持有该权限的用户的权限码集合
      await this.permissionsCache.invalidateAllAuthCache();
      return serializePermission(permission);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ApiException(DATA_ERROR.DUPLICATE_ENTRY, '权限编码必须唯一', null, 409);
      }
      if (isRecordNotFoundError(error)) {
        throw new ApiException(DATA_ERROR.NOT_FOUND, '权限不存在', null, 404);
      }
      throw new ApiException(DATA_ERROR.UPDATE_FAILED, '权限更新失败', error, 500);
    }
  }

  async remove(id: number) {
    const permission = await this.prisma.permissions.findUnique({
      where: { id },
      include: { _count: { select: { children: true } } },
    });
    if (!permission) {
      throw new ApiException(DATA_ERROR.NOT_FOUND, '权限不存在', null, 404);
    }
    if (permission._count.children > 0) {
      throw new ApiException(DATA_ERROR.VALIDATION_FAILED, '请先删除子权限', null, 409);
    }

    try {
      await this.prisma.$transaction([
        this.prisma.rolePermissions.deleteMany({ where: { permission_id: id } }),
        this.prisma.permissions.delete({ where: { id } }),
      ]);
    } catch (error) {
      if (isRecordNotFoundError(error)) {
        throw new ApiException(DATA_ERROR.NOT_FOUND, '权限不存在', null, 404);
      }
      throw new ApiException(DATA_ERROR.DELETE_FAILED, '权限删除失败', error, 500);
    }

    await this.permissionsCache.invalidateAllAuthCache();
    return { id: id.toString() };
  }
}
