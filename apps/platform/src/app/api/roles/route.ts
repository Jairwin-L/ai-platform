import type { NextRequest } from 'next/server';
import { RoleCode, SYSTEM_ROLE_CODES } from '@/constants';
import { RoleStatus, type Prisma } from '@/generated/prisma/client';
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

type RoleStatusValue = (typeof RoleStatus)[keyof typeof RoleStatus];

const roleStatuses = new Set<string>(Object.values(RoleStatus));

function normalizeRoleCode(value: string | undefined): string {
  return value?.trim().toUpperCase() ?? '';
}

function normalizeRoleName(value: string | undefined): string {
  return value?.trim() ?? '';
}

function getRoleStatus(value: string | undefined): RoleStatusValue | undefined {
  return value !== undefined && roleStatuses.has(value) ? (value as RoleStatusValue) : undefined;
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
      { code: { contains: searchTerm, mode: 'insensitive' } },
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

    return createPaginatedResponse(data, total, page, pageSize, '角色列表查询成功');
  } catch (error) {
    return createErrorResponse(DATA_ERROR.QUERY_FAILED, '角色列表查询失败', error, 500);
  }
};

const createRoleHandler: ApiHandler = async (request: NextRequest) => {
  let body: {
    code?: string;
    name?: string;
    description?: string;
    is_system?: boolean;
    permissions?: unknown;
    status?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch (error) {
    return createErrorResponse(DATA_ERROR.VALIDATION_FAILED, '请求 JSON 格式无效', error, 400);
  }

  const { permissions, ...roleData } = body;
  const code = normalizeRoleCode(roleData.code);
  const name = normalizeRoleName(roleData.name);
  const status = getRoleStatus(roleData.status);
  const permissionIds = normalizePermissionIds(permissions);

  if (!code) {
    return createErrorResponse(DATA_ERROR.VALIDATION_FAILED, '角色编码不能为空', null, 400);
  }

  if (!SYSTEM_ROLE_CODES.includes(code as RoleCode)) {
    return createErrorResponse(
      DATA_ERROR.VALIDATION_FAILED,
      '角色编码不在系统定义范围内',
      null,
      422,
    );
  }

  if (!name) {
    return createErrorResponse(DATA_ERROR.VALIDATION_FAILED, '角色名称不能为空', null, 400);
  }

  if (code === RoleCode.SUPER_ADMIN || code === RoleCode.SITE_USER) {
    return createErrorResponse(
      DATA_ERROR.VALIDATION_FAILED,
      `${code} 只能通过 seed 初始化`,
      null,
      403,
    );
  }

  if (roleData.status !== undefined && !status) {
    return createErrorResponse(DATA_ERROR.VALIDATION_FAILED, '角色状态无效', null, 422);
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const newRole = await tx.roles.create({
        data: {
          code,
          name,
          description: roleData.description,
          is_system: roleData.is_system ?? false,
          status: status ?? RoleStatus.ENABLED,
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
      return createErrorResponse(DATA_ERROR.DUPLICATE_ENTRY, '角色编码必须唯一', error, 409);
    }

    return createErrorResponse(DATA_ERROR.CREATE_FAILED, '角色创建失败', error, 500);
  }
};

export const GET = withApiHandler(getRolesHandler);
export const POST = withApiHandler(createRoleHandler);
