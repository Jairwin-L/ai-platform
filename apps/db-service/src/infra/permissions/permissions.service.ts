import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { RedisService } from '@/infra/redis/redis.service';
import { logger } from '@/infra/logger/logger';
import type { SessionRealm } from '@/infra/session/session.service';
import { UserAuthQueryService, isAdminRole, type UserAuthSnapshot } from './user-auth.query';

// 换前缀让发布前缓存的旧结构直接失效，不必等 TTL。
// v2：平台用户与系统用户分表，缓存按会话域区分
const AUTH_CACHE_PREFIX = 'ai:auth:perms:v2:';
const AUTH_CACHE_TTL_SECONDS = 5 * 60;

function getAuthCacheKey(userId: string, realm: SessionRealm): string {
  return `${AUTH_CACHE_PREFIX}${realm}:${userId}`;
}

// 带期限的受限 / 封禁不能在缓存里活过截止时间，否则到期后还要多等一个 TTL 才恢复
function getCacheTtlSeconds(snapshot: UserAuthSnapshot): number {
  if (!snapshot.statusExpiresAt) return AUTH_CACHE_TTL_SECONDS;
  const remaining = Math.ceil((Date.parse(snapshot.statusExpiresAt) - Date.now()) / 1000);
  return Math.min(AUTH_CACHE_TTL_SECONDS, Math.max(1, remaining));
}

@Injectable()
export class PermissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly userAuthQuery: UserAuthQueryService,
  ) {}

  /**
   * 加载用户的有效角色 + 权限码。
   *
   * 鉴权链路每个请求都会调用，结果缓存在 Redis：多实例部署下缓存与失效才一致。
   * Redis 故障时直接回落到数据库，只影响性能不影响正确性。
   */
  async getUserRolesAndPermissions(
    userId: string | undefined,
    realm: SessionRealm,
  ): Promise<UserAuthSnapshot> {
    if (!userId) {
      return this.userAuthQuery.queryUserRolesAndPermissions(userId, realm);
    }

    const key = getAuthCacheKey(userId, realm);

    try {
      const redis = await this.redis.getClient();
      const cached = await redis.get(key);
      if (cached) {
        const snapshot = JSON.parse(cached) as Partial<UserAuthSnapshot>;
        // 缓存结构不完整时按未命中重新计算，避免系统用户被误判为无权进入管理端
        if (typeof snapshot.canAccessAdmin === 'boolean' && Array.isArray(snapshot.permissions)) {
          return snapshot as UserAuthSnapshot;
        }
      }

      const data = await this.userAuthQuery.queryUserRolesAndPermissions(userId, realm);
      await redis.set(key, JSON.stringify(data), { EX: getCacheTtlSeconds(data) });
      return data;
    } catch (error) {
      logger.warn({ error, userId, realm }, '[permissions] 权限缓存不可用，回落到数据库');
      return this.userAuthQuery.queryUserRolesAndPermissions(userId, realm);
    }
  }

  /**
   * 清除单个用户的鉴权缓存。系统用户被分配 / 移除角色、改状态或删除后调用（realm = admin）；
   * 平台用户被后台改状态后调用（realm = user），否则会话守卫最长要等 TTL 过期才会踢人。
   */
  async invalidateUserAuthCache(userId: string, realm: SessionRealm = 'admin'): Promise<void> {
    try {
      const redis = await this.redis.getClient();
      await redis.del(getAuthCacheKey(userId, realm));
    } catch (error) {
      logger.warn({ error, userId, realm }, '[permissions] 清除用户权限缓存失败');
    }
  }

  /** 清除某个角色下所有系统用户的缓存。角色的权限集合或启停状态变化后调用 */
  async invalidateRoleAuthCache(roleId: string): Promise<void> {
    try {
      const userRoles = await this.prisma.userRole.findMany({
        where: { roleId },
        select: { userId: true },
      });
      if (userRoles.length === 0) return;

      const redis = await this.redis.getClient();
      await redis.del(userRoles.map((userRole) => getAuthCacheKey(userRole.userId, 'admin')));
    } catch (error) {
      logger.warn({ error, roleId }, '[permissions] 清除角色权限缓存失败');
    }
  }

  /** 清空全部权限缓存。权限实体本身被增删改（影响面无法按角色收敛）时调用 */
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

  /**
   * 找出当前账号无权授出的权限码。
   *
   * 非超级管理员只能把自己已拥有的权限（含为展示菜单自动补齐的上级节点）授出去，
   * 否则持有「编辑角色」的人可以给任意角色——包括自己的——追加任意权限，接口鉴权形同虚设。
   */
  async findUngrantablePermissionCodes(currentUser: AuthUser, codes: string[]): Promise<string[]> {
    if (codes.length === 0 || isAdminRole(currentUser.roles)) return [];

    const ownedResources = await this.userAuthQuery.queryUserPermissionResources(
      currentUser.userId,
    );
    const ownedCodes = new Set(ownedResources.map((resource) => resource.code));
    return Array.from(new Set(codes.filter((code) => !ownedCodes.has(code))));
  }

  /** 找出把指定角色分配给他人时会越权授出的权限码：角色的权限集合必须是当前账号权限的子集 */
  async findUngrantableRolePermissionCodes(
    currentUser: AuthUser,
    roleIds: string[],
  ): Promise<string[]> {
    if (roleIds.length === 0 || isAdminRole(currentUser.roles)) return [];

    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId: { in: roleIds } },
      select: { permission: { select: { code: true } } },
    });
    return this.findUngrantablePermissionCodes(
      currentUser,
      rolePermissions.map((rolePermission) => rolePermission.permission.code),
    );
  }
}
