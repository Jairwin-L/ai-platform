/**
 * @file 管理后台鉴权接口，对应 apps/db-service 的 AdminAuthController。
 */
import { AUTH } from '../const';
import { get, post } from '../request';

export type AuthPayload = IApiAuth.AuthPayload;

async function getLoginPublicKey(): Promise<string | null> {
  try {
    const data = await get<{ publicKey: string }>(AUTH.LOGIN_PUBLIC_KEY, undefined, {
      silent: true,
    });
    return data?.publicKey ?? null;
  } catch {
    return null;
  }
}

/**
 * 用服务端下发的 SPKI 公钥做 RSA-OAEP(SHA-256) 加密，
 * 与 apps/db-service/src/infra/crypto/login-rsa.ts 的解密参数一一对应。
 */
async function encryptWithRsaOaep(publicKeyPem: string, plaintext: string): Promise<string> {
  const pemBody = publicKeyPem
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s+/g, '');
  const binary = atob(pemBody);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'spki',
    bytes,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  );
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, new TextEncoder().encode(plaintext)),
  );
  return btoa(Array.from(encrypted, (byte) => String.fromCharCode(byte)).join(''));
}

/**
 * 拿不到公钥或加密失败时回落明文：服务端两种形态都支持，
 * 宁可退回明文（走 HTTPS）也不要因为加密链路故障导致完全登不上。
 */
async function encryptPasswordIfPossible(
  password: string,
): Promise<{ encrypted: boolean; password: string }> {
  if (typeof crypto?.subtle === 'undefined') return { encrypted: false, password };

  const publicKey = await getLoginPublicKey();
  if (!publicKey) return { encrypted: false, password };

  try {
    return { encrypted: true, password: await encryptWithRsaOaep(publicKey, password) };
  } catch {
    return { encrypted: false, password };
  }
}

/** 管理后台登录：只下发会话 Cookie，当前账号统一以 /auth/me 为准 */
export async function adminLogin(data: { email: string; password: string }) {
  const { password, encrypted } = await encryptPasswordIfPossible(data.password);
  return post<null>(AUTH.LOGIN, { email: data.email, password, encrypted }, { silent: true });
}

export function fetchCurrentUser() {
  return get<AuthPayload>(AUTH.ME, undefined, { silent: true });
}

export function logout() {
  return post<null>(AUTH.LOGOUT, undefined, { silent: true });
}
