import type { NextRequest } from 'next/server';
import { ADMIN_ROLE_CODES, RoleCode } from '@/constants';
import { UserStatusType, type Prisma } from '@/generated/prisma/client';
import {
  AUTH_ERROR,
  COMMON_ERROR,
  DATA_ERROR,
  createErrorResponse,
  createSuccessResponse,
  withApiHandler,
} from '@/lib/server';
import { getAuthUserBySessionToken, getSessionCookieName } from '@/lib/server/auth-session';
import type { ApiContext } from '@/lib/server/types';
import { getUserProfile } from '@/lib/server/user-profile';
import { prisma } from '@/lib/prisma';

const userStatuses = new Set(['active', 'pending', 'restricted', 'banned', 'inactive']);
const selfEditableFields = new Set(['nick_name', 'bio']);

function getOptionalText(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new TypeError('用户字段必须为字符串或 null');
  }

  return value.trim() || null;
}

function getRoleIds(value: unknown): number[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new TypeError('roleIds 必须为数组');
  }

  const ids = value.map((item) => Number(item));
  if (ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new TypeError('roleIds 必须包含正整数');
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
      return createErrorResponse(COMMON_ERROR.PARAM_ERROR, '用户 ID 不能为空', null, 400);
    }

    const currentUserId = await getCurrentUserId(request);
    const user = await getUserProfile(userId, currentUserId);

    if (!user) {
      return createErrorResponse(DATA_ERROR.NOT_FOUND, '用户不存在', null, 404);
    }

    return createSuccessResponse(user, '用户详情查询成功');
  } catch (error) {
    return createErrorResponse(DATA_ERROR.QUERY_FAILED, '用户详情查询失败', error, 500);
  }
};

const updateUserHandler = async (request: NextRequest, context: ApiContext) => {
  const userId = await getUserId(context);

  if (!userId) {
    return createErrorResponse(COMMON_ERROR.PARAM_ERROR, '用户 ID 不能为空', null, 400);
  }

  let body: Record<string, unknown>;
  try {
    const payload: unknown = await request.json();
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new TypeError('请求体必须为对象');
    }

    body = payload as Record<string, unknown>;
  } catch (error) {
    return createErrorResponse(DATA_ERROR.VALIDATION_FAILED, '请求 JSON 格式无效', error, 400);
  }

  try {
    const token = request.cookies.get(getSessionCookieName())?.value;
    const currentUser = await getAuthUserBySessionToken(token);

    if (!currentUser) {
      return createErrorResponse(AUTH_ERROR.UNAUTHORIZED, '请先登录', null, 401);
    }

    const isSuperAdmin = currentUser.roles?.includes(RoleCode.SUPER_ADMIN) ?? false;
    const isAdmin =
      currentUser.roles?.some((role) =>
        ADMIN_ROLE_CODES.includes(role as (typeof ADMIN_ROLE_CODES)[number]),
      ) ?? false;
    if (!isAdmin && currentUser.userId !== userId) {
      return createErrorResponse(AUTH_ERROR.FORBIDDEN, '无权修改其他用户资料', null, 403);
    }

    if (!isAdmin && Object.keys(body).some((field) => !selfEditableFields.has(field))) {
      return createErrorResponse(
        DATA_ERROR.VALIDATION_FAILED,
        '包含不允许修改的资料字段',
        null,
        422,
      );
    }

    const targetSuperAdminRole = await prisma.userRoles.findFirst({
      where: {
        user_id: userId,
        revoked_at: null,
        role: { code: RoleCode.SUPER_ADMIN, status: 'ENABLED' },
      },
    });
    if (targetSuperAdminRole && !isSuperAdmin) {
      return createErrorResponse(AUTH_ERROR.FORBIDDEN, '不可操作 SUPER_ADMIN 用户', null, 403);
    }

    const { status } = body;
    if (status !== undefined && (typeof status !== 'string' || !userStatuses.has(status))) {
      return createErrorResponse(DATA_ERROR.VALIDATION_FAILED, '用户状态无效', null, 422);
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
      const now = new Date();
      if (roleIds !== undefined) {
        if (targetSuperAdminRole) {
          throw new RangeError('SUPER_ADMIN 的角色绑定关系不可通过普通 API 修改');
        }

        const selectedRoles = await transaction.roles.findMany({
          where: { id: { in: roleIds } },
          select: { code: true, id: true, status: true },
        });

        if (selectedRoles.length !== roleIds.length) {
          throw new TypeError('一个或多个角色不存在');
        }

        if (selectedRoles.some((role) => role.code === RoleCode.SUPER_ADMIN)) {
          throw new RangeError('SUPER_ADMIN 的角色绑定关系不可通过普通 API 修改');
        }

        if (selectedRoles.some((role) => role.status !== 'ENABLED')) {
          throw new TypeError('一个或多个角色已禁用');
        }

        await transaction.userRoles.updateMany({
          where: { user_id: userId, revoked_at: null },
          data: { revoked_at: now, revoked_by: currentUser.userId, updated_at: now },
        });
        if (roleIds.length > 0) {
          await transaction.userRoles.createMany({
            data: roleIds.map((roleId) => ({
              user_id: userId,
              role_id: roleId,
              assigned_by: currentUser.userId,
              assigned_at: now,
              updated_at: now,
            })),
          });
        }
      }

      await transaction.users.update({ where: { id: userId }, data });
    });

    const user = await getUserProfile(userId, currentUser.userId);
    return createSuccessResponse(user, '用户更新成功');
  } catch (error) {
    if (error instanceof RangeError) {
      return createErrorResponse(DATA_ERROR.VALIDATION_FAILED, error.message, null, 403);
    }

    if (error instanceof TypeError) {
      return createErrorResponse(DATA_ERROR.VALIDATION_FAILED, error.message, null, 422);
    }

    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return createErrorResponse(DATA_ERROR.DUPLICATE_ENTRY, '用户名已被使用', null, 409);
    }

    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') {
      return createErrorResponse(DATA_ERROR.NOT_FOUND, '用户不存在', null, 404);
    }

    return createErrorResponse(DATA_ERROR.UPDATE_FAILED, '用户更新失败', error, 500);
  }
};

export const GET = withApiHandler(getUserHandler);
export const PUT = withApiHandler(updateUserHandler);
