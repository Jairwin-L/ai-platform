import { alovaGet, alovaPost } from '@/api/alova';
import {
  requestVerificationCodeSchema,
  resetPasswordSchema,
  signUpSchema,
} from '@/lib/auth/schemas';

export type AuthCodePurpose = IApiAuth.AuthCodePurpose;
export type AuthPayload = IApiAuth.AuthPayload;
export type AuthUser = IApiAuth.AuthUser;

export async function requestVerificationCode(email: string, purpose: AuthCodePurpose) {
  const parsed = requestVerificationCodeSchema.safeParse({ email, purpose });

  if (!parsed.success) {
    throw new Error('邮箱或验证码用途无效');
  }

  return alovaPost<null>('/code', parsed.data);
}

export async function signUp(payload: { code: string; email: string; password: string }) {
  const parsed = signUpSchema.safeParse(payload);

  if (!parsed.success) {
    throw new Error('注册请求参数无效');
  }

  return alovaPost<null>('/sign-up', parsed.data);
}

export async function signInWithPassword(payload: { email: string; password: string }) {
  return alovaPost<AuthPayload>('/sign-in', {
    email: payload.email,
    method: 'password',
    password: payload.password,
  });
}

export async function signInWithCode(payload: { code: string; email: string }) {
  return alovaPost<AuthPayload>('/sign-in', {
    code: payload.code,
    email: payload.email,
    method: 'code',
  });
}

export async function requestResetPasswordCode() {
  return alovaPost<null>('/reset-password/code');
}

export async function resetPassword(payload: { code: string; password: string }) {
  const parsed = resetPasswordSchema.safeParse(payload);

  if (!parsed.success) {
    throw new Error('重置密码请求参数无效');
  }

  return alovaPost<null>('/reset-password', parsed.data);
}

export async function signOut() {
  return alovaPost<null>('/sign-out');
}

export async function getCurrentUser() {
  return alovaGet<AuthPayload>('/me');
}
