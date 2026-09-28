import { Injectable } from '@nestjs/common';
import type { Prisma } from '@/generated/prisma/client';
import { RoleCode } from '@ai/constants/roles';
import { DATA_ERROR } from '@ai/constants/error-codes';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { PermissionsService } from '@/infra/permissions/permissions.service';
import { ApiException } from '@/common/http/api-exception';
import { getSettledValue } from '@/common/utils/settled';
import { isRecordNotFoundError, isUniqueConstraintError } from '@/common/utils/prisma-error';
import type { CreateRoleInput, ListRolesQuery, UpdateRoleInput } from './schemas';

interface RolePermissionNode {
  id: string;
  name: string;
  code: string;
  parent_id: string | null;
  type: string;
  children?: RolePermissionNode[];
}

/** SUPER_ADMIN 与 SITE_USER 只能由 seed / bootstrap 维护，接口一律不允许创建或修改 */
const PROTECTED_ROLE_CODES = new Set<string>([RoleCode.SUPER_ADMIN, RoleCode.SITE_USER]);

function buildPermissionTree(permissions: RolePermissionNode[]): RolePermissionNode[] {
  const nodeMap = new Map<string, RolePermissionNode>();
  const roots: RolePermissionNode[] = [];

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

/** 角色 id 在库里是自增整数，接口统一按字符串返回，与迁移前的响应保持一致 */
function serializeRole<T extends { id: number }>(role: T) {
  return { ...role, id: role.id.toString() };
}

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionsCache: PermissionsService,
  ) {}

  async list(query: ListRolesQuery) {
    const { page, pageSize, skip, take, searchTerm } = query;
    const where: Prisma.RolesWhereInput = searchTerm
      ? {
          OR: [
            { code: { contains: searchTerm, mode: 'insensitive' } },
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
          ],
        }
      : {};

    const [totalResult, rolesResult] = await Promise.allSettled([
      this.prisma.roles.count({ where }),
      this.prisma.roles.findMany({
        where,
        skip,
        take,
        orderBy: { id: 'asc' },
        include: { _count: { select: { user_roles: true, role_permissions: true } } },
      }),
    ]);
    const total = getSettledValue(totalResult);
    const roles = getSettledValue(rolesResult);

    const data = roles.map((role) => ({
      id: role.id.toString(),
      code: role.code,
      name: role.name,
      description: role.description,
      is_system: role.is_system,
      status: role.status,
      created_at: role.created_at,
      updated_at: role.updated_at,
      user_count: role._count.user_roles,
      permission_count: role._count.role_permissions,
    }));

    return { data, total, page, pageSize };
  }

  async findOne(id: number) {
    const role = await this.prisma.roles.findUnique({
      where: { id },
      include: { _count: { select: { user_roles: true } } },
    });
    if (!role) {
      throw new ApiException(DATA_ERROR.NOT_FOUND, '角色不存在', null, 404);
    }

    const [rolePermissionsResult, permissionsResult] = await Promise.allSettled([
      this.prisma.rolePermissions.findMany({
        where: { role_id: id },
        select: { permission_id: true },
      }),
      this.prisma.permissions.findMany({
        select: { id: true, name: true, code: true, parent_id: true, type: true },
        orderBy: { id: 'asc' },
      }),
    ]);
    const permissionIds = getSettledValue(rolePermissionsResult).map((item) => item.permission_id);
    const permissions = getSettledValue(permissionsResult).map((permission) => ({
      ...permission,
      id: permission.id.toString(),
      parent_id: permission.parent_id ? permission.parent_id.toString() : null,
    }));

    const { _count: count, ...rest } = role;
    return {
      ...serializeRole(rest),
      user_count: count.user_roles,
      permission_count: permissionIds.length,
      permissions: permissionIds.map((permissionId) => permissionId.toString()),
      permissionsTree: buildPermissionTree(permissions),
    };
  }

  private async assertPermissionsExist(permissionIds: number[]): Promise<void> {
    if (permissionIds.length === 0) return;
    const count = await this.prisma.permissions.count({ where: { id: { in: permissionIds } } });
    if (count !== permissionIds.length) {
      throw new ApiException(DATA_ERROR.VALIDATION_FAILED, '部分权限不存在', null, 422);
    }
  }

  async create(body: CreateRoleInput) {
    if (PROTECTED_ROLE_CODES.has(body.code)) {
      throw new ApiException(
        DATA_ERROR.VALIDATION_FAILED,
        `${body.code} 只能通过 seed 初始化`,
        null,
        403,
      );
    }
    const permissionIds = body.permissions ?? [];
    await this.assertPermissionsExist(permissionIds);

    try {
      const role = await this.prisma.$transaction(async (tx) => {
        const created = await tx.roles.create({
          data: {
            code: body.code,
            name: body.name,
            description: body.description ?? null,
            is_system: body.is_system ?? false,
            status: body.status ?? 'ENABLED',
          },
        });
        if (permissionIds.length > 0) {
          await tx.rolePermissions.createMany({
            data: permissionIds.map((permissionId) => ({
              role_id: created.id,
              permission_id: permissionId,
            })),
          });
        }
        return created;
      });
      return serializeRole(role);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ApiException(DATA_ERROR.DUPLICATE_ENTRY, '角色编码必须唯一', null, 409);
      }
      throw new ApiException(DATA_ERROR.CREATE_FAILED, '角色创建失败', error, 500);
    }
  }

  async update(id: number, body: UpdateRoleInput) {
    const existing = await this.prisma.roles.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiException(DATA_ERROR.NOT_FOUND, '角色不存在', null, 404);
    }
    if (
      PROTECTED_ROLE_CODES.has(existing.code) ||
      (body.code !== undefined && PROTECTED_ROLE_CODES.has(body.code))
    ) {
      throw new ApiException(
        DATA_ERROR.VALIDATION_FAILED,
        'SUPER_ADMIN/SITE_USER 不允许通过普通 API 修改',
        null,
        403,
      );
    }
    if (body.permissions) {
      await this.assertPermissionsExist(body.permissions);
    }

    try {
      const role = await this.prisma.$transaction(async (tx) => {
        if (body.permissions) {
          await tx.rolePermissions.deleteMany({ where: { role_id: id } });
          if (body.permissions.length > 0) {
            await tx.rolePermissions.createMany({
              data: body.permissions.map((permissionId) => ({
                role_id: id,
                permission_id: permissionId,
              })),
            });
          }
        }

        return tx.roles.update({
          where: { id },
          data: {
            code: body.code,
            name: body.name,
            description: body.description,
            is_system: body.is_system,
            status: body.status,
            updated_at: new Date(),
          },
        });
      });

      // 角色的权限集合或启停状态变了，持有它的所有用户权限都要重算
      await this.permissionsCache.invalidateAllAuthCache();
      return serializeRole(role);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ApiException(DATA_ERROR.DUPLICATE_ENTRY, '角色编码必须唯一', null, 409);
      }
      if (isRecordNotFoundError(error)) {
        throw new ApiException(DATA_ERROR.NOT_FOUND, '角色不存在', null, 404);
      }
      throw new ApiException(DATA_ERROR.UPDATE_FAILED, '角色更新失败', error, 500);
    }
  }

  async remove(id: number) {
    const role = await this.prisma.roles.findUnique({
      where: { id },
      include: { _count: { select: { user_roles: true } } },
    });
    if (!role) {
      throw new ApiException(DATA_ERROR.NOT_FOUND, '角色不存在', null, 404);
    }
    if (role.is_system) {
      throw new ApiException(DATA_ERROR.VALIDATION_FAILED, '系统内置角色不可删除', null, 403);
    }
    // user_roles 对角色没有级联删除，直接删会撞外键变成 500，提前给出能照着处理的提示
    if (role._count.user_roles > 0) {
      throw new ApiException(
        DATA_ERROR.VALIDATION_FAILED,
        '角色仍有关联用户（含已撤销的授权记录），无法删除',
        null,
        409,
      );
    }

    try {
      await this.prisma.$transaction([
        this.prisma.rolePermissions.deleteMany({ where: { role_id: id } }),
        this.prisma.roles.delete({ where: { id } }),
      ]);
    } catch (error) {
      if (isRecordNotFoundError(error)) {
        throw new ApiException(DATA_ERROR.NOT_FOUND, '角色不存在', null, 404);
      }
      throw new ApiException(DATA_ERROR.DELETE_FAILED, '角色删除失败', error, 500);
    }

    await this.permissionsCache.invalidateAllAuthCache();
    return { id: id.toString() };
  }
}
