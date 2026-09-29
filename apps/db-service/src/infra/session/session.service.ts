import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { CookieOptions, Response } from 'express';
import { ADMIN_SESSION_COOKIE_NAME, AUTH_SESSION_COOKIE_NAME } from '@ai/constants/auth';
import { RedisService } from '@/infra/redis/redis.service';

/** user：platform 前台用户；admin：管理后台。两者 Cookie 与 Redis 前缀都隔离，互不串用 */
export type SessionRealm = 'user' | 'admin';

const SESSION_KEY_PREFIX: Record<SessionRealm, string> = {
  user: 'ai:session:',
  admin: 'ai:admin-session:',
};
/** 每个用户名下的会话 id 集合，改密码时靠它找到并作废该用户的全部会话 */
const SESSION_INDEX_KEY_PREFIX: Record<SessionRealm, string> = {
  user: 'ai:session-index:',
  admin: 'ai:admin-session-index:',
};
/** 与迁移前 user_sessions 的 30 天有效期保持一致，读取时滑动续期 */
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function getSessionCookieName(realm: SessionRealm): string {
  return realm === 'admin' ? ADMIN_SESSION_COOKIE_NAME : AUTH_SESSION_COOKIE_NAME;
}

function getSessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS * 1000,
  };
}

function getSessionKey(sessionId: string, realm: SessionRealm) {
  return `${SESSION_KEY_PREFIX[realm]}${sessionId}`;
}

function getSessionIndexKey(userId: string, realm: SessionRealm) {
  return `${SESSION_INDEX_KEY_PREFIX[realm]}${userId}`;
}

function parseSession(value: string | null): AuthSession | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as AuthSession;
  } catch {
    return null;
  }
}

/**
 * Redis 会话。Cookie 里只放随机会话 id，服务端不落任何可逆的凭据。
 */
@Injectable()
export class SessionService {
  constructor(private readonly redis: RedisService) {}

  async createSession(payload: AuthSession, realm: SessionRealm = 'user'): Promise<string> {
    const redis = await this.redis.getClient();
    const sessionId = randomBytes(32).toString('base64url');
    const indexKey = getSessionIndexKey(payload.userId, realm);
    await redis
      .multi()
      .set(getSessionKey(sessionId, realm), JSON.stringify(payload), {
        EX: SESSION_MAX_AGE_SECONDS,
      })
      .sAdd(indexKey, sessionId)
      .expire(indexKey, SESSION_MAX_AGE_SECONDS)
      .exec();
    return sessionId;
  }

  async getSession(sessionId: string, realm: SessionRealm = 'user'): Promise<AuthSession | null> {
    const redis = await this.redis.getClient();
    // 读取的同时续期，避免 GET + EXPIRE 两次网络往返
    const value = await redis.getEx(getSessionKey(sessionId, realm), {
      type: 'EX',
      value: SESSION_MAX_AGE_SECONDS,
    });
    if (!value) return null;

    const session = parseSession(value);
    if (!session) {
      await redis.del(getSessionKey(sessionId, realm));
      return null;
    }

    // 会话是滑动续期的，索引要跟着续，否则连续活跃的会话会从索引里掉出去，改密码时就踢不掉它。
    // 不 await：索引维护失败只影响「改密码踢人」，不能拖慢或打断鉴权链路
    const indexKey = getSessionIndexKey(session.userId, realm);
    void redis
      .multi()
      .sAdd(indexKey, sessionId)
      .expire(indexKey, SESSION_MAX_AGE_SECONDS)
      .exec()
      .catch(() => undefined);
    return session;
  }

  async destroySession(sessionId: string, realm: SessionRealm = 'user'): Promise<void> {
    if (!sessionId) return;
    const redis = await this.redis.getClient();
    const session = parseSession(await redis.getDel(getSessionKey(sessionId, realm)));
    if (session) {
      await redis.sRem(getSessionIndexKey(session.userId, realm), sessionId);
    }
  }

  /**
   * 作废某个用户在指定会话域下的全部会话，可保留发起操作的那一个。
   * 改密码 / 重置密码 / 账号被停用后调用。
   */
  async destroyUserSessions(
    userId: string,
    realm: SessionRealm,
    keepSessionId?: string,
  ): Promise<void> {
    const redis = await this.redis.getClient();
    const indexKey = getSessionIndexKey(userId, realm);
    const sessionIds = (await redis.sMembers(indexKey)).filter((id) => id !== keepSessionId);
    if (sessionIds.length === 0) return;

    await redis
      .multi()
      .del(sessionIds.map((id) => getSessionKey(id, realm)))
      .sRem(indexKey, sessionIds)
      .exec();
  }

  setSessionCookie(response: Response, sessionId: string, realm: SessionRealm = 'user'): void {
    response.cookie(getSessionCookieName(realm), sessionId, getSessionCookieOptions());
  }

  clearSessionCookie(response: Response, realm: SessionRealm = 'user'): void {
    response.cookie(getSessionCookieName(realm), '', {
      ...getSessionCookieOptions(),
      maxAge: 0,
    });
  }
}
