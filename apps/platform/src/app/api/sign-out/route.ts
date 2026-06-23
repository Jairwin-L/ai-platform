import type { NextRequest } from 'next/server';
import { createSuccessResponse, withApiHandler } from '@/lib/server';
import {
  clearSessionCookie,
  getSessionCookieName,
  revokeUserSession,
} from '@/lib/server/auth-session';

export const POST = withApiHandler(async (request: NextRequest) => {
  const token = request.cookies.get(getSessionCookieName())?.value;

  await revokeUserSession(token);

  const response = createSuccessResponse(null, '退出登录成功');
  clearSessionCookie(response);

  return response;
});
