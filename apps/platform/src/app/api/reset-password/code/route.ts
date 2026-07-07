import type { NextRequest } from 'next/server';
import { createSuccessResponse, withAuthenticatedApiHandler } from '@/lib/server';
import { createValidationError } from '@/lib/server/auth-route';
import { sendVerificationCodeEmail } from '@/lib/server/auth-email';
import {
  createVerificationCode,
  normalizeEmail,
  removeVerificationCode,
  saveVerificationCode,
} from '@/lib/server/auth-verification';
import type { ApiContext } from '@/lib/server/types';

export const POST = withAuthenticatedApiHandler(
  async (_request: NextRequest, context: ApiContext) => {
    if (!context.user?.email) {
      return createValidationError('当前账号未绑定邮箱');
    }

    const email = normalizeEmail(context.user.email);
    const code = createVerificationCode();
    await saveVerificationCode(email, 'reset-password', code);

    try {
      await sendVerificationCodeEmail(email, code, 'reset-password');
    } catch (error) {
      await removeVerificationCode(email, 'reset-password');
      throw error;
    }

    return createSuccessResponse(null, '验证码已发送，1 分钟内有效');
  },
);
