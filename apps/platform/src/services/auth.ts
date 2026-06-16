import { alovaGet, alovaPost } from '@/utils/alova';

export type AuthCodePurpose = 'sign-in' | 'sign-up';

export interface AuthUser {
  email: string | null;
  emailVerified: boolean | null;
  id: string;
  nickName: string | null;
  status: string;
}

export interface AuthPayload {
  permissions: string[];
  roles: string[];
  user: AuthUser;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

function assertApiResponse<T>(response: unknown): ApiResponse<T> {
  const result = response as ApiResponse<T>;

  if (!result.success) {
    throw new Error(result.message || 'Request failed');
  }

  return result;
}

export async function requestVerificationCode(email: string, purpose: AuthCodePurpose) {
  const response = await alovaPost('/api/code', { email, purpose });
  return assertApiResponse<null>(response).data;
}

export async function signUp(payload: { code: string; email: string; password: string }) {
  const response = await alovaPost('/api/sign-up', {
    code: payload.code,
    email: payload.email,
    password: payload.password,
  });

  return assertApiResponse<AuthPayload>(response).data;
}

export async function signInWithPassword(payload: { email: string; password: string }) {
  const response = await alovaPost('/api/sign-in', {
    email: payload.email,
    method: 'password',
    password: payload.password,
  });

  return assertApiResponse<AuthPayload>(response).data;
}

export async function signInWithCode(payload: { code: string; email: string }) {
  const response = await alovaPost('/api/sign-in', {
    code: payload.code,
    email: payload.email,
    method: 'code',
  });

  return assertApiResponse<AuthPayload>(response).data;
}

export async function signOut() {
  const response = await alovaPost('/api/sign-out');
  return assertApiResponse<null>(response).data;
}

export async function getCurrentUser() {
  const response = await alovaGet('/api/me');
  return assertApiResponse<AuthPayload>(response).data;
}
