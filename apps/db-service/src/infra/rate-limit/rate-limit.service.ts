import { Injectable } from '@nestjs/common';
import { RedisService } from '@/infra/redis/redis.service';
import { logger } from '@/infra/logger/logger';

export { getClientIp, resolveClientIp } from '@/common/http/client-ip';

export interface RateLimitRule {
  /** 计数窗口长度（秒） */
  windowSeconds: number;
  /** 单个窗口内允许的最大请求数 */
  max: number;
  /** Redis key 前缀，用于区分不同接口的配额 */
  scope: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

@Injectable()
export class RateLimitService {
  constructor(private readonly redis: RedisService) {}

  /**
   * 固定窗口计数限流。
   *
   * 窗口开始时用 SET NX EX 建出带过期时间的计数 key，之后只 INCR，三条命令一次往返；
   * INCR 与 EXPIRE 分两步的话，进程在中间崩溃会留下永不过期的计数，把对应 IP 永久拦住。
   * Redis 不可用时放行而不是拦截，避免缓存故障直接打挂登录入口。
   */
  async consume(
    identifier: string,
    { windowSeconds, max, scope }: RateLimitRule,
  ): Promise<RateLimitResult> {
    const key = `ai:ratelimit:${scope}:${identifier}`;

    try {
      const redis = await this.redis.getClient();
      const [, countReply, ttlReply] = await redis
        .multi()
        .set(key, 0, { expiration: { type: 'EX', value: windowSeconds }, condition: 'NX' })
        .incr(key)
        .ttl(key)
        .exec();
      const count = Number(countReply);
      let ttl = Number(ttlReply);

      if (ttl < 0) {
        await redis.expire(key, windowSeconds);
        ttl = windowSeconds;
      }

      if (count > max) {
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: ttl > 0 ? ttl : windowSeconds,
        };
      }

      return { allowed: true, remaining: max - count, retryAfterSeconds: 0 };
    } catch (error) {
      logger.error({ error, scope }, '[rate-limit] Redis 不可用，本次请求放行');
      return { allowed: true, remaining: max, retryAfterSeconds: 0 };
    }
  }
}
