import type { NextRequest } from 'next/server';
import {
  createDuplicateEmailError,
  createEmailNotRegisteredError,
  createUnavailableAccountError,
  createValidationError,
} from '@/lib/server/auth-route';
import { requestVerificationCodeSchema } from '@/lib/auth/schemas';
import { createSuccessResponse, withApiHandler } from '@/lib/server';
import { sendVerificationCodeEmail } from '@/lib/server/auth-email';
import {
  createVerificationCode,
  normalizeEmail,
  removeVerificationCode,
  saveVerificationCode,
} from '@/lib/server/auth-verification';
import { findUserByEmail } from '@/lib/server/auth-user';

export const POST = withApiHandler(async (request: NextRequest) => {
  const parsed = requestVerificationCodeSchema.safeParse(await request.json());

  if (!parsed.success) {
    return createValidationError('邮箱或验证码用途无效');
  }

  const email = normalizeEmail(parsed.data.email);
  const user = await findUserByEmail(email);

  if (parsed.data.purpose === 'sign-up' && user) {
    return createDuplicateEmailError();
  }

  if (parsed.data.purpose === 'sign-in') {
    if (!user) {
      return createEmailNotRegisteredError();
    }

    if (user.is_deleted || user.status !== 'active') {
      return createUnavailableAccountError();
    }
  }

  const code = createVerificationCode();
  await saveVerificationCode(email, parsed.data.purpose, code);

  try {
    await sendVerificationCodeEmail(email, code, parsed.data.purpose);
  } catch (error) {
    await removeVerificationCode(email, parsed.data.purpose);
    throw error;
  }

  return createSuccessResponse(null, '验证码已发送，1 分钟内有效');
});
