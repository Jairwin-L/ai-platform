import type { NextRequest } from 'next/server';
import type { PermissionType, Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import {
  DATA_ERROR,
  createErrorResponse,
  createPaginatedResponse,
  createSuccessResponse,
  withApiHandler,
  type ApiHandler,
} from '@/lib/server';

function buildPermissionTree(permissions: IRouteApi.PermissionNode[]): IRouteApi.PermissionNode[] {
  const nodeMap = new Map<number, IRouteApi.PermissionNode>();
  const roots: IRouteApi.PermissionNode[] = [];

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

function getPositiveInteger(value: string | null, fallback: number): number {
  const parsed = value ? Number.parseInt(value, 10) : fallback;

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getPermissionType(value: string): PermissionType | undefined {
  const allowed = new Set(['system', 'page', 'module', 'operation', 'data']);

  return allowed.has(value) ? (value as PermissionType) : undefined;
}

/**
 * @openapi
 * /api/permissions:
 *   get:
 *     tags:
 *       - Permissions
 *     summary: Get permissions list
 *   post:
 *     tags:
 *       - Permissions
 *     summary: Create new permission
 */
const getPermissionsHandler: ApiHandler = async (request: NextRequest) => {
  const { searchParams } = request.nextUrl;
  const page = getPositiveInteger(searchParams.get('page'), 1);
  const pageSize = getPositiveInteger(searchParams.get('pageSize'), 10);
  const searchTerm = searchParams.get('searchTerm') || '';
  const type = searchParams.get('type') || '';
  const tree = searchParams.get('tree') === 'true';
  const skip = (page - 1) * pageSize;
  const where: Prisma.PermissionsWhereInput = {};

  if (searchTerm) {
    where.OR = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { code: { contains: searchTerm, mode: 'insensitive' } },
      { description: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  if (type && type !== 'all') {
    const permissionType = getPermissionType(type);
    if (permissionType) {
      where.type = permissionType;
    }
  }

  try {
    const total = await prisma.permissions.count({ where });
    const permissions = await prisma.permissions.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { id: 'asc' },
    });

    if (tree) {
      return createPaginatedResponse(
        buildPermissionTree(permissions),
        total,
        page,
        pageSize,
        '权限树查询成功',
      );
    }

    return createPaginatedResponse(permissions, total, page, pageSize, '权限列表查询成功');
  } catch (error) {
    return createErrorResponse(DATA_ERROR.QUERY_FAILED, '权限列表查询失败', error, 500);
  }
};

const createPermissionHandler: ApiHandler = async (request: NextRequest) => {
  let body: Prisma.PermissionsUncheckedCreateInput;

  try {
    body = (await request.json()) as Prisma.PermissionsUncheckedCreateInput;
  } catch (error) {
    return createErrorResponse(DATA_ERROR.VALIDATION_FAILED, '请求 JSON 格式无效', error, 400);
  }

  try {
    const permission = await prisma.permissions.create({ data: body });

    return createSuccessResponse(permission, '权限创建成功', 201);
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return createErrorResponse(DATA_ERROR.DUPLICATE_ENTRY, '权限编码必须唯一', error, 409);
    }

    return createErrorResponse(DATA_ERROR.CREATE_FAILED, '权限创建失败', error, 500);
  }
};

export const GET = withApiHandler(getPermissionsHandler);
export const POST = withApiHandler(createPermissionHandler);
