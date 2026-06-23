import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { DATA_ERROR } from '@/constants/error-codes';
import {
  createDuplicateEmailError,
  createValidationError,
  emailSchema,
  passwordSchema,
  verificationCodeSchema,
} from '@/lib/server/auth-route';
import { createErrorResponse, createSuccessResponse, withApiHandler } from '@/lib/server';
import {
  createUserSession,
  getAuthUserBySessionToken,
  setSessionCookie,
  toAuthPayload,
} from '@/lib/server/auth-session';
import { createEmailUser, findUserByEmail } from '@/lib/server/auth-user';
import { normalizeEmail, verifyCode } from '@/lib/server/auth-verification';

const requestSchema = z
  .object({
    code: verificationCodeSchema,
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

export const POST = withApiHandler(async (request: NextRequest) => {
  const parsed = requestSchema.safeParse(await request.json());

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
    const user = await createEmailUser({ email, password: parsed.data.password });
    const token = await createUserSession(user.id);
    const authUser = await getAuthUserBySessionToken(token);

    if (!authUser) {
      return createErrorResponse(DATA_ERROR.CREATE_FAILED, '注册登录状态创建失败', null, 500);
    }

    const response = createSuccessResponse(toAuthPayload(authUser), '注册成功', 201);
    setSessionCookie(response, token);

    return response;
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return createDuplicateEmailError();
    }

    throw error;
  }
});
