import type { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  createEmailNotRegisteredError,
  createUnavailableAccountError,
  createValidationError,
  emailSchema,
  passwordSchema,
  verificationCodeSchema,
} from '@/lib/server/auth-route';
import { AUTH_ERROR } from '@/constants/error-codes';
import { createErrorResponse, createSuccessResponse, withApiHandler } from '@/lib/server';
import {
  createUserSession,
  getAuthUserBySessionToken,
  setSessionCookie,
  toAuthPayload,
  verifyPassword,
} from '@/lib/server/auth-session';
import { findUserByEmail } from '@/lib/server/auth-user';
import { normalizeEmail, verifyCode } from '@/lib/server/auth-verification';

const passwordSignInSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    method: z.literal('password'),
  })
  .strict();

const codeSignInSchema = z
  .object({
    code: verificationCodeSchema,
    email: emailSchema,
    method: z.literal('code'),
  })
  .strict();

const requestSchema = z.discriminatedUnion('method', [passwordSignInSchema, codeSignInSchema]);

function createInvalidCredentialsResponse() {
  return createErrorResponse(AUTH_ERROR.UNAUTHORIZED, '邮箱或登录凭证错误', null, 401);
}

export const POST = withApiHandler(async (request: NextRequest) => {
  const parsed = requestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return createValidationError('登录请求参数无效');
  }

  const email = normalizeEmail(parsed.data.email);
  const user = await findUserByEmail(email);

  if (!user) {
    return createEmailNotRegisteredError();
  }

  if (user.is_deleted || user.status !== 'active') {
    return createUnavailableAccountError();
  }

  if (parsed.data.method === 'password') {
    const passwordOk = await verifyPassword(parsed.data.password, user.password_hash);

    if (!passwordOk) {
      return createInvalidCredentialsResponse();
    }
  }

  if (parsed.data.method === 'code') {
    const codeOk = await verifyCode(email, 'sign-in', parsed.data.code);

    if (!codeOk) {
      return createInvalidCredentialsResponse();
    }
  }

  const token = await createUserSession(user.id);
  const authUser = await getAuthUserBySessionToken(token);

  if (!authUser) {
    return createInvalidCredentialsResponse();
  }

  const response = createSuccessResponse(toAuthPayload(authUser), '登录成功');
  setSessionCookie(response, token);

  return response;
});
