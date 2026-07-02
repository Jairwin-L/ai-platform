import { describe, expect, it } from 'vite-plus/test';
import { BYOK_ERROR_CODE } from '@/lib/ai/byok/constants';
import {
  assertRateLimit,
  runWithConcurrencyLimit,
  type RateLimitRedisClient,
} from '@/lib/ai/security/rate-limit';

class MemoryRateLimitRedisClient implements RateLimitRedisClient {
  values = new Map<string, number>();
  expirations = new Map<string, number>();

  async decr(key: string): Promise<number> {
    const nextValue = (this.values.get(key) ?? 0) - 1;
    this.values.set(key, nextValue);

    return nextValue;
  }

  async expire(key: string, seconds: number): Promise<void> {
    this.expirations.set(key, seconds);
  }

  async incr(key: string): Promise<number> {
    const nextValue = (this.values.get(key) ?? 0) + 1;
    this.values.set(key, nextValue);

    return nextValue;
  }
}

describe('BYOK rate limit', () => {
  it('blocks requests after the configured window limit', async () => {
    const redisClient = new MemoryRateLimitRedisClient();
    const input = {
      userId: 'user-1',
      ip: '127.0.0.1',
      route: 'chat',
      limit: 2,
      windowSeconds: 60,
    };

    await assertRateLimit(input, redisClient);
    await assertRateLimit(input, redisClient);

    await expect(assertRateLimit(input, redisClient)).rejects.toMatchObject({
      code: BYOK_ERROR_CODE.RATE_LIMITED,
      status: 429,
    });
    expect(Array.from(redisClient.expirations.values())).toEqual([60]);
  });

  it('releases concurrency counters after successful tasks', async () => {
    const redisClient = new MemoryRateLimitRedisClient();

    const result = await runWithConcurrencyLimit(
      {
        userId: 'user-1',
        ip: '127.0.0.1',
        route: 'chat',
        limit: 1,
        ttlSeconds: 60,
      },
      async () => 'ok',
      redisClient,
    );

    expect(result).toBe('ok');
    expect(Array.from(redisClient.values.values())).toEqual([0]);
    expect(Array.from(redisClient.expirations.values())).toEqual([60]);
  });

  it('releases concurrency counters when the limit is exceeded', async () => {
    let decrCount = 0;
    const redisClient: RateLimitRedisClient = {
      async decr() {
        decrCount += 1;

        return 1;
      },
      async expire() {
        return undefined;
      },
      async incr() {
        return 2;
      },
    };

    await expect(
      runWithConcurrencyLimit(
        {
          userId: 'user-1',
          ip: '127.0.0.1',
          route: 'chat',
          limit: 1,
          ttlSeconds: 60,
        },
        async () => 'blocked',
        redisClient,
      ),
    ).rejects.toMatchObject({
      code: BYOK_ERROR_CODE.RATE_LIMITED,
      status: 429,
    });
    expect(decrCount).toBe(1);
  });
});
