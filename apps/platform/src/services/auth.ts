import { alovaGet, alovaPost } from '@/utils/alova';

export type AuthCodePurpose = 'sign-in' | 'sign-up';

export interface AuthUser {
  email: string | null;
  emailVerified: boolean | null;
  id: string;
  nickName: string | null;
  picture: string | null;
  status: string;
}

export interface AuthPayload {
  permissions: string[];
  roles: string[];
  user: AuthUser;
}

export async function requestVerificationCode(email: string, purpose: AuthCodePurpose) {
  return alovaPost<null>('/api/code', { email, purpose });
}

export async function signUp(payload: { code: string; email: string; password: string }) {
  return alovaPost<null>('/api/sign-up', {
    code: payload.code,
    email: payload.email,
    password: payload.password,
  });
}

export async function signInWithPassword(payload: { email: string; password: string }) {
  return alovaPost<AuthPayload>('/api/sign-in', {
    email: payload.email,
    method: 'password',
    password: payload.password,
  });
}

export async function signInWithCode(payload: { code: string; email: string }) {
  return alovaPost<AuthPayload>('/api/sign-in', {
    code: payload.code,
    email: payload.email,
    method: 'code',
  });
}

export async function signOut() {
  return alovaPost<null>('/api/sign-out');
}

export async function getCurrentUser() {
  return alovaGet<AuthPayload>('/api/me');
}
