import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { AUTH_ERROR } from '@ai/constants/error-codes';
import {
  SessionService,
  getSessionCookieName,
  type SessionRealm,
} from '@/infra/session/session.service';
import { PermissionsService } from '@/infra/permissions/permissions.service';
import { ApiException } from '@/common/http/api-exception';
import { AUTH_OPTIONAL_KEY, REALM_KEY } from '@/common/decorators/metadata';
import type { AuthenticatedRequest } from '@/common/types/request';

/**
 * Session 鉴权守卫：按会话域读取对应 HttpOnly Cookie 中的 Redis Session，并注入 request.user。
 *
 * 前台与后台是同一张 users 表，但会话域彼此隔离：
 * - user：platform 前台，要求账号有效（未删除、状态 active）；
 * - admin：管理后台，额外要求当前仍持有 SUPER_ADMIN / ADMIN 角色，角色被收回后会话立即作废。
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly session: SessionService,
    private readonly permissions: PermissionsService,
  ) {}

  private async revokeSession(
    request: AuthenticatedRequest,
    response: Response,
    realm: SessionRealm,
  ): Promise<void> {
    const sessionId = request.cookies?.[getSessionCookieName(realm)] ?? '';
    await this.session.destroySession(sessionId, realm).catch(() => undefined);
    this.session.clearSessionCookie(response, realm);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const optional = this.reflector.getAllAndOverride<boolean>(AUTH_OPTIONAL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!optional) return this.authenticate(context);

    // 会话可选的接口：会话无效只当匿名处理，不能因为一个过期 Cookie 把公开页面变成 401
    try {
      return await this.authenticate(context);
    } catch (error) {
      if (error instanceof ApiException) return true;
      throw error;
    }
  }

  private async authenticate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const response = http.getResponse<Response>();
    const realm =
      this.reflector.getAllAndOverride<SessionRealm>(REALM_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'user';

    const sessionId = request.cookies?.[getSessionCookieName(realm)];
    if (!sessionId) {
      throw new ApiException(AUTH_ERROR.UNAUTHORIZED, undefined, null, 401);
    }

    const session = await this.session.getSession(sessionId, realm);
    if (!session) {
      this.session.clearSessionCookie(response, realm);
      throw new ApiException(AUTH_ERROR.UNAUTHORIZED, undefined, null, 401);
    }

    const { roles, permissions, status, canAccessAdmin } =
      await this.permissions.getUserRolesAndPermissions(session.userId);

    // 用户被停用或删除后，已签发的会话仍在有效期内：每个请求都复核一次账号状态（走缓存），
    // 使停用/删除立即生效。迁移前按「查不到有效用户」处理，这里保持 401
    if (status !== 'active') {
      await this.revokeSession(request, response, realm);
      throw new ApiException(AUTH_ERROR.UNAUTHORIZED, undefined, null, 401);
    }

    if (realm === 'admin' && !canAccessAdmin) {
      await this.revokeSession(request, response, realm);
      throw new ApiException(AUTH_ERROR.FORBIDDEN, '当前账号没有管理后台访问权限', null, 403);
    }

    request.user = { userId: session.userId, roles, permissions };
    return true;
  }
}
