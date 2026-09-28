import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(crypto.scrypt);
const KEY_LENGTH = 64;

/**
 * 「账号不存在」分支用的占位 hash：同样跑一次 scrypt，抹平与「密码错误」之间的耗时差，
 * 避免按响应耗时枚举已注册邮箱。盐值不涉及任何真实账号，写死没有风险。
 */
const DUMMY_PASSWORD_HASH = `scrypt:${'0'.repeat(22)}:${'0'.repeat(86)}`;

/** 存储格式沿用迁移前的 `scrypt:<salt>:<hash>`，已有账号的密码无需重置 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('base64url');
  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;

  return `scrypt:${salt}:${derived.toString('base64url')}`;
}

export function isSupportedPasswordHash(passwordHash?: string | null): passwordHash is string {
  if (!passwordHash) return false;

  const [algorithm, salt, stored] = passwordHash.split(':');
  return algorithm === 'scrypt' && Boolean(salt && stored);
}

export async function verifyPassword(
  password: string,
  passwordHash?: string | null,
): Promise<boolean> {
  if (!isSupportedPasswordHash(passwordHash)) return false;

  const [, salt, stored] = passwordHash.split(':');
  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  const storedBuffer = Buffer.from(stored, 'base64url');

  return storedBuffer.length === derived.length && crypto.timingSafeEqual(storedBuffer, derived);
}

/** 消耗一次与真实校验等价的计算，用于账号不存在或没有密码的分支 */
export async function burnPasswordVerification(password: string): Promise<void> {
  await verifyPassword(password || 'placeholder', DUMMY_PASSWORD_HASH);
}
