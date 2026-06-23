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

async function getUserId(context: ApiContext): Promise<string | undefined> {
  const params = await context.params;
  const id = params?.id;

  return Array.isArray(id) ? id[0] : id;
}

/**
 * @openapi
 * /api/users/{id}/permissions:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user permissions
 */
const getUserPermissionsHandler: ApiHandler = async (
  _request: NextRequest,
  context: ApiContext,
) => {
  const userId = await getUserId(context);

  if (!userId) {
    return createErrorResponse(DATA_ERROR.VALIDATION_FAILED, '未提供用户 ID', null, 400);
  }

  try {
    const userRoles = await prisma.userRoles.findMany({
      where: { user_id: userId },
      include: {
        role: {
          include: {
            role_permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });
    const permissionMap = new Map<
      number,
      {
        id: number;
        name: string;
        code: string;
        type: string;
        parent_id: number | null;
        description?: string;
      }
    >();

    for (const userRole of userRoles) {
      for (const rolePermission of userRole.role.role_permissions) {
        const { permission } = rolePermission;
        if (!permissionMap.has(permission.id)) {
          permissionMap.set(permission.id, {
            id: permission.id,
            name: permission.name,
            code: permission.code,
            type: permission.type,
            parent_id: permission.parent_id,
            description: permission.description ?? undefined,
          });
        }
      }
    }

    return createSuccessResponse(Array.from(permissionMap.values()), '用户权限查询成功');
  } catch (error) {
    return createErrorResponse(DATA_ERROR.QUERY_FAILED, '用户权限查询失败', error, 500);
  }
};

export const GET = withApiHandler(getUserPermissionsHandler);
