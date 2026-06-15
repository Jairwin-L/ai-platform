import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  DATA_ERROR,
  createErrorResponse,
  createSuccessResponse,
  withApiHandler,
  type ApiContext,
  type ApiHandler,
} from '@/lib/server';

interface PermissionNode {
  id: string;
  name: string;
  code: string;
  parent_id: string | null;
  type: string;
  children?: PermissionNode[];
}

async function getRoleId(context: ApiContext): Promise<number | null> {
  const params = await context.params;
  const id = params?.id;
  const value = Array.isArray(id) ? id[0] : id;
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;

  return Number.isInteger(parsed) ? parsed : null;
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

function normalizePermissionIds(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(value.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0)),
  );
}

async function getPermissionTree(permissionIds: number[]) {
  const permissions = await prisma.permissions.findMany({
    select: {
      id: true,
      name: true,
      code: true,
      parent_id: true,
      type: true,
    },
    orderBy: { id: 'asc' },
  });
  const processed = permissions.map((permission) => ({
    ...permission,
    id: permission.id.toString(),
    parent_id: permission.parent_id ? permission.parent_id.toString() : null,
  }));

  return {
    treeData: buildPermissionTree(processed),
    permissionIds: permissionIds.map((id) => id.toString()),
  };
}

/**
 * @openapi
 * /api/roles/{id}:
 *   get:
 *     tags:
 *       - Roles
 *     summary: Get role details
 *   put:
 *     tags:
 *       - Roles
 *     summary: Update role
 *   delete:
 *     tags:
 *       - Roles
 *     summary: Delete role
 */
const getRoleHandler: ApiHandler = async (_request: NextRequest, context: ApiContext) => {
  const id = await getRoleId(context);

  if (!id) {
    return createErrorResponse(DATA_ERROR.VALIDATION_FAILED, 'Missing role ID in URL', null, 400);
  }

  try {
    const role = await prisma.roles.findUnique({
      where: { id },
      include: {
        _count: {
          select: { user_roles: true },
        },
      },
    });

    if (!role) {
      return createErrorResponse(DATA_ERROR.NOT_FOUND, 'Role not found', null, 404);
    }

    const rolePermissions = await prisma.rolePermissions.findMany({
      where: { role_id: id },
      select: { permission_id: true },
    });
    const permissionIds = rolePermissions.map((item) => item.permission_id);
    const permissionTree = await getPermissionTree(permissionIds);

    return createSuccessResponse(
      {
        ...role,
        id: role.id.toString(),
        user_count: role._count.user_roles,
        permission_count: permissionIds.length,
        _count: undefined,
        permissions: permissionTree.permissionIds,
        permissionsTree: permissionTree.treeData,
      },
      'Role details retrieved successfully',
    );
  } catch (error) {
    return createErrorResponse(
      DATA_ERROR.QUERY_FAILED,
      'Failed to retrieve role details',
      error,
      500,
    );
  }
};

const updateRoleHandler: ApiHandler = async (request: NextRequest, context: ApiContext) => {
  const id = await getRoleId(context);

  if (!id) {
    return createErrorResponse(DATA_ERROR.VALIDATION_FAILED, 'Missing role ID in URL', null, 400);
  }

  let body: {
    name?: string;
    description?: string | null;
    is_system?: boolean;
    permissions?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch (error) {
    return createErrorResponse(DATA_ERROR.VALIDATION_FAILED, 'Request JSON is invalid', error, 400);
  }

  const { permissions, ...roleData } = body;
  const permissionIds = normalizePermissionIds(permissions);

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (permissions) {
        await tx.rolePermissions.deleteMany({ where: { role_id: id } });

        if (permissionIds.length > 0) {
          await tx.rolePermissions.createMany({
            data: permissionIds.map((permissionId) => ({
              role_id: id,
              permission_id: permissionId,
            })),
          });
        }
      }

      return tx.roles.update({
        where: { id },
        data: {
          name: roleData.name,
          description: roleData.description,
          is_system: roleData.is_system,
          updated_at: new Date(),
        },
      });
    });

    return createSuccessResponse(
      {
        ...result,
        id: result.id.toString(),
      },
      'Role updated successfully',
    );
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return createErrorResponse(
        DATA_ERROR.DUPLICATE_ENTRY,
        'Article role name must be unique',
        error,
        409,
      );
    }

    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') {
      return createErrorResponse(DATA_ERROR.NOT_FOUND, 'Role not found', error, 404);
    }

    return createErrorResponse(DATA_ERROR.UPDATE_FAILED, 'Failed to update role', error, 500);
  }
};

const deleteRoleHandler: ApiHandler = async (_request: NextRequest, context: ApiContext) => {
  const id = await getRoleId(context);

  if (!id) {
    return createErrorResponse(DATA_ERROR.VALIDATION_FAILED, 'Missing role ID in URL', null, 400);
  }

  try {
    await prisma.rolePermissions.deleteMany({ where: { role_id: id } });
    await prisma.roles.delete({ where: { id } });

    return createSuccessResponse({ id }, 'Role deleted successfully');
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') {
      return createErrorResponse(DATA_ERROR.NOT_FOUND, 'Role not found', error, 404);
    }

    return createErrorResponse(DATA_ERROR.DELETE_FAILED, 'Failed to delete role', error, 500);
  }
};

export const GET = withApiHandler(getRoleHandler);
export const PUT = withApiHandler(updateRoleHandler);
export const DELETE = withApiHandler(deleteRoleHandler);
