import crypto from 'node:crypto';
import { redisDecr, redisExpire, redisIncr } from '@/lib/server/redis';
import { BYOK_AUDIT_EVENT, BYOK_ERROR_CODE } from '@/lib/ai/byok/constants';
import { ByokPublicError } from '@/lib/ai/byok/errors';
import { writeByokAuditEvent } from './audit';

export type RateLimitInput = IByok.RateLimitInput;
export type RateLimitRedisClient = IByok.RateLimitRedisClient;

const defaultRateLimitRedisClient: RateLimitRedisClient = {
  decr: redisDecr,
  expire: redisExpire,
  incr: redisIncr,
};

async function releaseConcurrencyKey(
  key: string,
  redisClient: RateLimitRedisClient,
): Promise<void> {
  try {
    await redisClient.decr(key);
  } catch {
    // Do not mask the original provider result with a best-effort counter cleanup failure.
  }
}

function createRateLimitKey(input: RateLimitInput): string {
  const nowWindow = Math.floor(Date.now() / (input.windowSeconds * 1000));
  const source = `${input.userId}:${input.ip}:${input.route}:${nowWindow}`;
  const digest = crypto.createHash('sha256').update(source).digest('hex');

  return `ai:byok:rate:v1:${digest}`;
}

function createConcurrencyKey(input: Omit<RateLimitInput, 'windowSeconds'>): string {
  const source = `${input.userId}:${input.route}`;
  const digest = crypto.createHash('sha256').update(source).digest('hex');

  return `ai:byok:concurrency:v1:${digest}`;
}

export async function assertRateLimit(
  input: RateLimitInput,
  redisClient = defaultRateLimitRedisClient,
): Promise<void> {
  const key = createRateLimitKey(input);
  const count = await redisClient.incr(key);

  if (count === 1) {
    await redisClient.expire(key, input.windowSeconds);
  }

  if (count > input.limit) {
    writeByokAuditEvent({
      eventType: BYOK_AUDIT_EVENT.RATE_LIMITED,
      actorId: input.userId,
      requestId: input.requestId,
      ip: input.ip,
      result: 'blocked',
      reasonCode: BYOK_ERROR_CODE.RATE_LIMITED,
    });

    throw new ByokPublicError(BYOK_ERROR_CODE.RATE_LIMITED, 429);
  }
}

export async function runWithConcurrencyLimit<T>(
  input: Omit<RateLimitInput, 'windowSeconds'> & { ttlSeconds: number },
  task: () => Promise<T>,
  redisClient = defaultRateLimitRedisClient,
): Promise<T> {
  const key = createConcurrencyKey(input);
  const count = await redisClient.incr(key);

  if (count === 1) {
    await redisClient.expire(key, input.ttlSeconds);
  }

  if (count > input.limit) {
    await releaseConcurrencyKey(key, redisClient);
    writeByokAuditEvent({
      eventType: BYOK_AUDIT_EVENT.RATE_LIMITED,
      actorId: input.userId,
      requestId: input.requestId,
      ip: input.ip,
      result: 'blocked',
      reasonCode: 'CONCURRENCY_LIMITED',
    });

    throw new ByokPublicError(BYOK_ERROR_CODE.RATE_LIMITED, 429);
  }

  try {
    return await task();
  } finally {
    await releaseConcurrencyKey(key, redisClient);
  }
}
