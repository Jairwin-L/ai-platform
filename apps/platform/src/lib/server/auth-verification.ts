import crypto from 'node:crypto';
import { VERIFICATION_CODE_TTL_SECONDS } from '@/constants';
import { redisDel, redisGet, redisSetEx } from './redis';

export type AuthCodePurpose = 'sign-in' | 'sign-up';

interface StoredVerificationCode {
  attempts: number;
  codeHash: string;
  expiresAt: number;
}

const CODE_TTL_SECONDS = VERIFICATION_CODE_TTL_SECONDS;
const MAX_VERIFY_ATTEMPTS = 5;

function getCodeSecret(): string {
  const secret = process.env.AUTH_CODE_SECRET ?? process.env.AUTH_SECRET;

  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_CODE_SECRET is not configured');
  }

  return secret ?? 'nextjs-starter-kit-auth-code';
}

function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function hashCode(email: string, purpose: AuthCodePurpose, code: string): string {
  return crypto
    .createHmac('sha256', getCodeSecret())
    .update(`${purpose}:${email}:${code}`)
    .digest('hex');
}

function createCodeKey(email: string, purpose: AuthCodePurpose): string {
  return `auth:verification:${purpose}:${hashValue(email)}`;
}

function isStoredVerificationCode(value: unknown): value is StoredVerificationCode {
  return (
    typeof value === 'object' &&
    value !== null &&
    'attempts' in value &&
    'codeHash' in value &&
    'expiresAt' in value
  );
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function createVerificationCode(): string {
  return String(crypto.randomInt(100000, 1000000));
}

export async function saveVerificationCode(
  email: string,
  purpose: AuthCodePurpose,
  code: string,
): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  const payload: StoredVerificationCode = {
    attempts: 0,
    codeHash: hashCode(normalizedEmail, purpose, code),
    expiresAt: Date.now() + CODE_TTL_SECONDS * 1000,
  };

  await redisSetEx(
    createCodeKey(normalizedEmail, purpose),
    CODE_TTL_SECONDS,
    JSON.stringify(payload),
  );
}

export async function removeVerificationCode(
  email: string,
  purpose: AuthCodePurpose,
): Promise<void> {
  await redisDel(createCodeKey(normalizeEmail(email), purpose));
}

export async function verifyCode(
  email: string,
  purpose: AuthCodePurpose,
  code: string,
): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email);
  const key = createCodeKey(normalizedEmail, purpose);
  const raw = await redisGet(key);

  if (!raw) {
    return false;
  }

  const parsed = JSON.parse(raw) as unknown;

  if (!isStoredVerificationCode(parsed) || parsed.expiresAt <= Date.now()) {
    await redisDel(key);
    return false;
  }

  const ok = safeEqual(parsed.codeHash, hashCode(normalizedEmail, purpose, code));

  if (ok) {
    await redisDel(key);
    return true;
  }

  const attempts = parsed.attempts + 1;

  if (attempts >= MAX_VERIFY_ATTEMPTS) {
    await redisDel(key);
    return false;
  }

  const ttlSeconds = Math.max(1, Math.ceil((parsed.expiresAt - Date.now()) / 1000));
  await redisSetEx(key, ttlSeconds, JSON.stringify({ ...parsed, attempts }));

  return false;
}
