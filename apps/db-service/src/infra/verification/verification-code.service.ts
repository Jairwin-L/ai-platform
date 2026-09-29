import crypto from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { VERIFICATION_CODE_TTL_SECONDS } from '@ai/constants';
import { RedisService } from '@/infra/redis/redis.service';

export type VerificationPurpose = 'sign-in' | 'sign-up' | 'reset-password';

/** 单个验证码最多允许校验的次数，用尽即作废，防止 6 位码被暴力穷举 */
const MAX_ATTEMPTS = 5;
/** 仅本地开发兜底；生产环境缺少 AUTH_CODE_SECRET 时直接报错 */
const DEVELOPMENT_CODE_SECRET = 'local-development-only-auth-code-secret';

function getCodeSecret(): string {
  // AUTH_SECRET 是迁移前的兼容回退，保证老环境变量仍然可用
  const secret = process.env.AUTH_CODE_SECRET ?? process.env.AUTH_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AUTH_CODE_SECRET 未配置');
    }
    return DEVELOPMENT_CODE_SECRET;
  }

  return secret;
}

function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/** Redis 里只存验证码的 HMAC，拿到 Redis 读权限也还原不出明文验证码 */
function hashCode(email: string, purpose: VerificationPurpose, code: string): string {
  return crypto
    .createHmac('sha256', getCodeSecret())
    .update(`${purpose}:${email}:${code}`)
    .digest('hex');
}

/** key 里的邮箱做哈希，Redis 键名不暴露用户邮箱 */
function getCodeKey(email: string, purpose: VerificationPurpose): string {
  return `ai:auth:verification:${purpose}:${hashValue(email)}`;
}

/** 校验次数单独用一个计数 key，靠 INCR 的原子性保证并发请求也只能试 MAX_ATTEMPTS 次 */
function getAttemptsKey(codeKey: string): string {
  return `${codeKey}:attempts`;
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

@Injectable()
export class VerificationCodeService {
  constructor(private readonly redis: RedisService) {}

  /** 生成并存储验证码，返回明文供发信使用；重新发码时清零校验次数 */
  async issue(email: string, purpose: VerificationPurpose): Promise<string> {
    const normalizedEmail = normalizeEmail(email);
    const code = String(crypto.randomInt(100000, 1000000));
    const key = getCodeKey(normalizedEmail, purpose);
    const redis = await this.redis.getClient();

    await redis
      .multi()
      .set(key, hashCode(normalizedEmail, purpose, code), { EX: VERIFICATION_CODE_TTL_SECONDS })
      .del(getAttemptsKey(key))
      .exec();
    return code;
  }

  /** 发信失败时撤回刚签发的验证码，避免用户拿着一封没收到的码干等 */
  async revoke(email: string, purpose: VerificationPurpose): Promise<void> {
    const key = getCodeKey(normalizeEmail(email), purpose);
    const redis = await this.redis.getClient();
    await redis.del([key, getAttemptsKey(key)]);
  }

  /**
   * 校验并核销验证码。
   *
   * 先原子地占用一次校验次数再比对，并发猜测也绕不过次数上限；
   * 核销以 DEL 的返回值为准，同一个验证码被并发提交也只会成功一次。
   */
  async consume(email: string, purpose: VerificationPurpose, input: string): Promise<boolean> {
    const normalizedEmail = normalizeEmail(email);
    const key = getCodeKey(normalizedEmail, purpose);
    const attemptsKey = getAttemptsKey(key);
    const redis = await this.redis.getClient();
    const expected = await redis.get(key);
    if (!expected) return false;

    const attempts = await redis.incr(attemptsKey);
    if (attempts === 1) {
      await redis.expire(attemptsKey, VERIFICATION_CODE_TTL_SECONDS);
    }
    if (attempts > MAX_ATTEMPTS) {
      await redis.del([key, attemptsKey]);
      return false;
    }

    if (safeEqual(expected, hashCode(normalizedEmail, purpose, input))) {
      const deleted = await redis.del(key);
      await redis.del(attemptsKey);
      return deleted === 1;
    }

    if (attempts >= MAX_ATTEMPTS) {
      await redis.del([key, attemptsKey]);
    }
    return false;
  }
}
