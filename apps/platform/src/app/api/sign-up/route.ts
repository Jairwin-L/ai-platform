import type { NextRequest } from 'next/server';
import { createDuplicateEmailError, createValidationError } from '@/lib/server/auth-route';
import { signUpSchema } from '@/lib/auth/schemas';
import { createSuccessResponse, withApiHandler } from '@/lib/server';
import { createEmailUser, findUserByEmail } from '@/lib/server/auth-user';
import { normalizeEmail, verifyCode } from '@/lib/server/auth-verification';

export const POST = withApiHandler(async (request: NextRequest) => {
  const parsed = signUpSchema.safeParse(await request.json());

  if (!parsed.success) {
    return createValidationError('注册请求参数无效');
  }

  const email = normalizeEmail(parsed.data.email);
  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    return createDuplicateEmailError();
  }

  const codeOk = await verifyCode(email, 'sign-up', parsed.data.code);

  if (!codeOk) {
    return createValidationError('验证码无效或已过期');
  }

  try {
    await createEmailUser({ email, password: parsed.data.password });

    return createSuccessResponse(null, '注册成功，请登录', 201);
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return createDuplicateEmailError();
    }

    throw error;
  }
});
