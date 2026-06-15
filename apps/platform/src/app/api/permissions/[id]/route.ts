import type { NextRequest } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  DATA_ERROR,
  createErrorResponse,
  createSuccessResponse,
  withApiHandler,
  type ApiContext,
  type ApiHandler,
} from '@/lib/server';

async function getPermissionId(context: ApiContext): Promise<number | null> {
  const params = await context.params;
  const id = params?.id;
  const value = Array.isArray(id) ? id[0] : id;
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;

  return Number.isInteger(parsed) ? parsed : null;
}

/**
 * @openapi
 * /api/permissions/{id}:
 *   get:
 *     tags:
 *       - Permissions
 *     summary: Get permission details
 *   put:
 *     tags:
 *       - Permissions
 *     summary: Update permission
 *   delete:
 *     tags:
 *       - Permissions
 *     summary: Delete permission
 */
const getPermissionHandler: ApiHandler = async (_request: NextRequest, context: ApiContext) => {
  const id = await getPermissionId(context);

  if (!id) {
    return createErrorResponse(
      DATA_ERROR.VALIDATION_FAILED,
      'Missing permission ID in URL',
      null,
      400,
    );
  }

  try {
    const permission = await prisma.permissions.findUnique({ where: { id } });

    if (!permission) {
      return createErrorResponse(DATA_ERROR.NOT_FOUND, 'Permission not found', null, 404);
    }

    return createSuccessResponse(permission, 'Permission details retrieved successfully');
  } catch (error) {
    return createErrorResponse(
      DATA_ERROR.QUERY_FAILED,
      'Failed to retrieve permission details',
      error,
      500,
    );
  }
};

const updatePermissionHandler: ApiHandler = async (request: NextRequest, context: ApiContext) => {
  const id = await getPermissionId(context);

  if (!id) {
    return createErrorResponse(
      DATA_ERROR.VALIDATION_FAILED,
      'Missing permission ID in URL',
      null,
      400,
    );
  }

  let body: Prisma.PermissionsUncheckedUpdateInput;
  try {
    body = (await request.json()) as Prisma.PermissionsUncheckedUpdateInput;
  } catch (error) {
    return createErrorResponse(DATA_ERROR.VALIDATION_FAILED, 'Request JSON is invalid', error, 400);
  }

  try {
    const permission = await prisma.permissions.update({ where: { id }, data: body });

    return createSuccessResponse(permission, 'Permission updated successfully');
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return createErrorResponse(
        DATA_ERROR.DUPLICATE_ENTRY,
        'Article permission code must be unique',
        error,
        409,
      );
    }

    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') {
      return createErrorResponse(DATA_ERROR.NOT_FOUND, 'Permission not found', error, 404);
    }

    return createErrorResponse(DATA_ERROR.UPDATE_FAILED, 'Failed to update permission', error, 500);
  }
};

const deletePermissionHandler: ApiHandler = async (_request: NextRequest, context: ApiContext) => {
  const id = await getPermissionId(context);

  if (!id) {
    return createErrorResponse(
      DATA_ERROR.VALIDATION_FAILED,
      'Missing permission ID in URL',
      null,
      400,
    );
  }

  try {
    await prisma.permissions.delete({ where: { id } });

    return createSuccessResponse({ id }, 'Permission deleted successfully');
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') {
      return createErrorResponse(DATA_ERROR.NOT_FOUND, 'Permission not found', error, 404);
    }

    return createErrorResponse(DATA_ERROR.DELETE_FAILED, 'Failed to delete permission', error, 500);
  }
};

export const GET = withApiHandler(getPermissionHandler);
export const PUT = withApiHandler(updatePermissionHandler);
export const DELETE = withApiHandler(deletePermissionHandler);
