import type { NextRequest } from 'next/server';
import {
  COMMON_ERROR,
  DATA_ERROR,
  createErrorResponse,
  createSuccessResponse,
  withApiHandler,
} from '@/lib/server';
import { getAuthUserBySessionToken, getSessionCookieName } from '@/lib/server/auth-session';
import type { ApiContext } from '@/lib/server/types';
import { getUserProfile } from '@/lib/server/user-profile';

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

export const GET = withApiHandler(getUserHandler);
