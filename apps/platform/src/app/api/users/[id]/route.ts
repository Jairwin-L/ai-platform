import type { NextRequest } from 'next/server';
import { UserStatusType, type Prisma } from '@prisma/client';
import {
  COMMON_ERROR,
  DATA_ERROR,
  createErrorResponse,
  createSuccessResponse,
  withApiHandler,
  withRoleApiHandler,
} from '@/lib/server';
import { getAuthUserBySessionToken, getSessionCookieName } from '@/lib/server/auth-session';
import type { ApiContext } from '@/lib/server/types';
import { getUserProfile } from '@/lib/server/user-profile';
import { prisma } from '@/lib/prisma';

const userStatuses = new Set(['active', 'pending', 'restricted', 'banned', 'inactive']);

function getOptionalText(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new TypeError('User fields must be strings or null');
  }

  return value.trim() || null;
}

function getRoleIds(value: unknown): number[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new TypeError('roleIds must be an array');
  }

  const ids = value.map((item) => Number(item));
  if (ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new TypeError('roleIds must contain positive integers');
  }

  return Array.from(new Set(ids));
}

async function getUserId(context: ApiContext): Promise<string | undefined> {
  const params = await context.params;
  const id = params?.id;

  return Array.isArray(id) ? id[0] : id;
}

async function getCurrentUserId(request: NextRequest): Promise<string | undefined> {
  const token = request.cookies.get(getSessionCookieName())?.value;
  const user = await getAuthUserBySessionToken(token);

  return user?.userId;
}

const getUserHandler = async (request: NextRequest, context: ApiContext) => {
  try {
    const userId = await getUserId(context);

    if (!userId) {
      return createErrorResponse(COMMON_ERROR.PARAM_ERROR, 'User id is required', null, 400);
    }

    const currentUserId = await getCurrentUserId(request);
    const user = await getUserProfile(userId, currentUserId);

    if (!user) {
      return createErrorResponse(DATA_ERROR.NOT_FOUND, '用户不存在', null, 404);
    }

    return createSuccessResponse(user, 'User details retrieved successfully');
  } catch (error) {
    return createErrorResponse(
      DATA_ERROR.QUERY_FAILED,
      'Failed to retrieve user details',
      error,
      500,
    );
  }
};

const updateUserHandler = async (request: NextRequest, context: ApiContext) => {
  const userId = await getUserId(context);

  if (!userId) {
    return createErrorResponse(COMMON_ERROR.PARAM_ERROR, 'User id is required', null, 400);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch (error) {
    return createErrorResponse(DATA_ERROR.VALIDATION_FAILED, 'Request JSON is invalid', error, 400);
  }

  try {
    const { status } = body;
    if (status !== undefined && (typeof status !== 'string' || !userStatuses.has(status))) {
      return createErrorResponse(DATA_ERROR.VALIDATION_FAILED, 'Invalid user status', null, 422);
    }

    const roleIds = getRoleIds(body.roleIds);
    const data: Prisma.UsersUpdateInput = { updated_at: new Date() };
    const fullName = getOptionalText(body.full_name);
    const nickName = getOptionalText(body.nick_name);
    const userName = getOptionalText(body.user_name);
    const bio = getOptionalText(body.bio);

    if (fullName !== undefined) {
      data.full_name = fullName;
    }
    if (nickName !== undefined) {
      data.nick_name = nickName;
    }
    if (userName !== undefined) {
      data.user_name = userName;
    }
    if (bio !== undefined) {
      data.bio = bio;
    }
    if (status !== undefined) {
      data.status = status as UserStatusType;
    }

    await prisma.$transaction(async (transaction) => {
      if (roleIds !== undefined) {
        const roleCount = await transaction.roles.count({ where: { id: { in: roleIds } } });
        if (roleCount !== roleIds.length) {
          throw new TypeError('One or more roles do not exist');
        }

        await transaction.userRoles.deleteMany({ where: { user_id: userId } });
        if (roleIds.length > 0) {
          await transaction.userRoles.createMany({
            data: roleIds.map((roleId) => ({ user_id: userId, role_id: roleId })),
          });
        }
      }

      await transaction.users.update({ where: { id: userId }, data });
    });

    const user = await getUserProfile(userId);
    return createSuccessResponse(user, 'User updated successfully');
  } catch (error) {
    if (error instanceof TypeError) {
      return createErrorResponse(DATA_ERROR.VALIDATION_FAILED, error.message, null, 422);
    }

    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return createErrorResponse(
        DATA_ERROR.DUPLICATE_ENTRY,
        'Username is already in use',
        null,
        409,
      );
    }

    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') {
      return createErrorResponse(DATA_ERROR.NOT_FOUND, 'User does not exist', null, 404);
    }

    return createErrorResponse(DATA_ERROR.UPDATE_FAILED, 'Failed to update user', error, 500);
  }
};

export const GET = withApiHandler(getUserHandler);
export const PUT = withRoleApiHandler(['admin'], updateUserHandler);
