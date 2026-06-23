import type { NextRequest } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  DATA_ERROR,
  createErrorResponse,
  createPaginatedResponse,
  createSuccessResponse,
  withApiHandler,
  type ApiHandler,
} from '@/lib/server';

function getPositiveInteger(value: string | null, fallback: number): number {
  const parsed = value ? Number.parseInt(value, 10) : fallback;

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizePermissionIds(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(value.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0)),
  );
}

/**
 * @openapi
 * /api/roles:
 *   get:
 *     tags:
 *       - Roles
 *     summary: Get roles list
 *   post:
 *     tags:
 *       - Roles
 *     summary: Create new role
 */
const getRolesHandler: ApiHandler = async (request: NextRequest) => {
  const { searchParams } = request.nextUrl;
  const page = getPositiveInteger(searchParams.get('page'), 1);
  const pageSize = getPositiveInteger(searchParams.get('pageSize'), 10);
  const searchTerm = searchParams.get('searchTerm') || '';
  const skip = (page - 1) * pageSize;
  const where: Prisma.RolesWhereInput = {};

  if (searchTerm) {
    where.OR = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { description: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  try {
    const total = await prisma.roles.count({ where });
    const roles = await prisma.roles.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { id: 'asc' },
      include: {
        _count: {
          select: { user_roles: true, role_permissions: true },
        },
      },
    });
    const data = roles.map((role) => ({
      id: role.id.toString(),
      name: role.name,
      description: role.description,
      is_system: role.is_system,
      created_at: role.created_at,
      updated_at: role.updated_at,
      user_count: role._count.user_roles,
      permission_count: role._count.role_permissions,
    }));

    return createPaginatedResponse(data, total, page, pageSize, '角色列表查询成功');
  } catch (error) {
    return createErrorResponse(DATA_ERROR.QUERY_FAILED, '角色列表查询失败', error, 500);
  }
};

const createRoleHandler: ApiHandler = async (request: NextRequest) => {
  let body: {
    name?: string;
    description?: string;
    is_system?: boolean;
    permissions?: unknown;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch (error) {
    return createErrorResponse(DATA_ERROR.VALIDATION_FAILED, '请求 JSON 格式无效', error, 400);
  }

  const { permissions, ...roleData } = body;
  const permissionIds = normalizePermissionIds(permissions);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const newRole = await tx.roles.create({
        data: {
          name: roleData.name!,
          description: roleData.description,
          is_system: roleData.is_system ?? false,
        },
      });

      if (permissionIds.length > 0) {
        await tx.rolePermissions.createMany({
          data: permissionIds.map((permissionId) => ({
            role_id: newRole.id,
            permission_id: permissionId,
          })),
        });
      }

      return newRole;
    });

    return createSuccessResponse(
      {
        ...result,
        id: result.id.toString(),
      },
      '角色创建成功',
      201,
    );
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return createErrorResponse(DATA_ERROR.DUPLICATE_ENTRY, '角色名称必须唯一', error, 409);
    }

    return createErrorResponse(DATA_ERROR.CREATE_FAILED, '角色创建失败', error, 500);
  }
};

export const GET = withApiHandler(getRolesHandler);
export const POST = withApiHandler(createRoleHandler);
