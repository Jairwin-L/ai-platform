import type { NextRequest } from 'next/server';
import { resetPasswordSchema } from '@/lib/auth/schemas';
import { createValidationError } from '@/lib/server/auth-route';
import { createSuccessResponse, withAuthenticatedApiHandler } from '@/lib/server';
import { clearSessionCookie } from '@/lib/server/auth-session';
import { updateUserPassword } from '@/lib/server/auth-user';
import { normalizeEmail, verifyCode } from '@/lib/server/auth-verification';
import type { ApiContext } from '@/lib/server/types';

export const POST = withAuthenticatedApiHandler(
  async (request: NextRequest, context: ApiContext) => {
    const parsed = resetPasswordSchema.safeParse(await request.json());

    if (!parsed.success) {
      return createValidationError('重置密码请求参数无效');
    }

    if (!context.user?.email) {
      return createValidationError('当前账号未绑定邮箱');
    }

    const email = normalizeEmail(context.user.email);
    const codeOk = await verifyCode(email, 'reset-password', parsed.data.code);

    if (!codeOk) {
      return createValidationError('验证码无效或已过期');
    }

    await updateUserPassword(context.user.userId, parsed.data.password);

    const response = createSuccessResponse(null, '密码已重置，请重新登录');
    clearSessionCookie(response);

    return response;
  },
);
