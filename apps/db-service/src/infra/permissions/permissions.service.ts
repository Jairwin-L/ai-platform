import { Injectable } from '@nestjs/common';
import { RedisService } from '@/infra/redis/redis.service';
import { logger } from '@/infra/logger/logger';
import { UserAuthQueryService, type UserAuthSnapshot } from './user-auth.query';

// 换前缀让发布前缓存的旧结构直接失效，不必等 TTL
const AUTH_CACHE_PREFIX = 'ai:auth:perms:v1:';
const AUTH_CACHE_TTL_SECONDS = 5 * 60;

function getAuthCacheKey(userId: string): string {
  return `${AUTH_CACHE_PREFIX}${userId}`;
}

@Injectable()
export class PermissionsService {
  constructor(
    private readonly redis: RedisService,
    private readonly userAuthQuery: UserAuthQueryService,
  ) {}

  /**
   * 加载用户的有效角色 + 权限码。
   *
   * 鉴权链路每个请求都会调用，结果缓存在 Redis：多实例部署下缓存与失效才一致。
   * Redis 故障时直接回落到数据库，只影响性能不影响正确性。
   */
  async getUserRolesAndPermissions(userId: string | undefined): Promise<UserAuthSnapshot> {
    if (!userId) {
      return this.userAuthQuery.queryUserRolesAndPermissions(userId);
    }

    const key = getAuthCacheKey(userId);

    try {
      const redis = await this.redis.getClient();
      const cached = await redis.get(key);
      if (cached) {
        const snapshot = JSON.parse(cached) as Partial<UserAuthSnapshot>;
        // 缓存结构不完整时按未命中重新计算
        if (typeof snapshot.canAccessAdmin === 'boolean' && Array.isArray(snapshot.permissions)) {
          return snapshot as UserAuthSnapshot;
        }
      }

      const data = await this.userAuthQuery.queryUserRolesAndPermissions(userId);
      await redis.set(key, JSON.stringify(data), { EX: AUTH_CACHE_TTL_SECONDS });
      return data;
    } catch (error) {
      logger.warn({ error, userId }, '[permissions] 权限缓存不可用，回落到数据库');
      return this.userAuthQuery.queryUserRolesAndPermissions(userId);
    }
  }

  /** 清除单个用户的鉴权缓存：改角色、改状态、删除用户后调用 */
  async invalidateUserAuthCache(userId: string): Promise<void> {
    try {
      const redis = await this.redis.getClient();
      await redis.del(getAuthCacheKey(userId));
    } catch (error) {
      logger.warn({ error, userId }, '[permissions] 清除用户权限缓存失败');
    }
  }

  /**
   * 清空全部权限缓存。角色的权限集合、角色启停、权限实体本身变化时影响面无法按用户收敛，直接全清。
   */
  async invalidateAllAuthCache(): Promise<void> {
    try {
      const redis = await this.redis.getClient();
      const keys: string[] = [];
      for await (const key of redis.scanIterator({ MATCH: `${AUTH_CACHE_PREFIX}*`, COUNT: 200 })) {
        if (Array.isArray(key)) keys.push(...key);
        else keys.push(key);
      }
      if (keys.length > 0) {
        await redis.del(keys);
      }
    } catch (error) {
      logger.warn({ error }, '[permissions] 清空权限缓存失败');
    }
  }
}
