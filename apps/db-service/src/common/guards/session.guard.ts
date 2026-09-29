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
import {
  getAccountStatusMessage,
  getRestrictedActionMessage,
} from '@/common/http/account-status-message';
import { ALLOW_RESTRICTED_KEY, AUTH_OPTIONAL_KEY, REALM_KEY } from '@/common/decorators/metadata';
import type { AuthenticatedRequest } from '@/common/types/request';

const READONLY_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Session 鉴权守卫：按会话域读取对应 HttpOnly Cookie 中的 Redis Session，并注入 request.user。
 *
 * 平台用户（users）与系统用户（system_users）分表，会话域彼此隔离：
 * - user：platform 前台，受限用户保留会话但只能发只读请求，其余非正常状态直接作废会话；
 * - admin：管理端，要求系统用户仍持有至少一个已启用的角色，角色被收回后会话立即作废。
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly session: SessionService,
    private readonly permissions: PermissionsService,
  ) {}

  /** 作废当前请求携带的会话，并顺手清掉失效的 Cookie */
  private async revokeSession(
    request: AuthenticatedRequest,
    response: Response,
    realm: SessionRealm,
  ): Promise<void> {
    const sessionId = request.cookies?.[getSessionCookieName(realm)] ?? '';
    await this.session.destroySession(sessionId, realm).catch(() => undefined);
    this.session.clearSessionCookie(response, realm);
  }

  /**
   * 受限用户默认只放行只读请求：以后新增的写接口不用逐个记得拦截。
   * 确实要放行的写接口（如重置密码）显式标注 @AllowRestricted()。
   */
  private allowsRestrictedUser(context: ExecutionContext, method: string | undefined): boolean {
    if (READONLY_METHODS.has(method?.toUpperCase() ?? '')) return true;
    return Boolean(
      this.reflector.getAllAndOverride<boolean>(ALLOW_RESTRICTED_KEY, [
        context.getHandler(),
        context.getClass(),
      ]),
    );
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

    const { roles, permissions, status, statusReason, statusExpiresAt, canAccessAdmin } =
      await this.permissions.getUserRolesAndPermissions(session.userId, realm);

    // 用户被停用或删除后，已签发的会话仍在有效期内：每个请求都复核一次账号状态（走缓存），
    // 使停用 / 删除立即生效
    if (status === null) {
      await this.revokeSession(request, response, realm);
      throw new ApiException(AUTH_ERROR.UNAUTHORIZED, undefined, null, 401);
    }
    const statusDetail = { reason: statusReason, expiresAt: statusExpiresAt };
    // 受限的平台用户保留会话、可以浏览，只拦写操作；其余非正常状态直接作废会话
    const isRestrictedUser = realm === 'user' && status === 'restricted';
    if (status !== 'active' && !isRestrictedUser) {
      await this.revokeSession(request, response, realm);
      // 按状态区分的提示只给平台用户，管理端会话保持统一提示
      throw new ApiException(
        AUTH_ERROR.ACCOUNT_DISABLED,
        realm === 'user' ? getAccountStatusMessage(status, statusDetail) : undefined,
        null,
        403,
      );
    }
    if (isRestrictedUser && !this.allowsRestrictedUser(context, request.method)) {
      throw new ApiException(
        AUTH_ERROR.FORBIDDEN,
        getRestrictedActionMessage(statusDetail),
        null,
        403,
      );
    }

    // 管理端会话只属于系统用户：角色被全部移除或停用后同样立即作废，
    // 否则被收回后台权限的人仍能调用只做登录校验的管理端接口
    if (realm === 'admin' && !canAccessAdmin) {
      await this.revokeSession(request, response, realm);
      throw new ApiException(AUTH_ERROR.FORBIDDEN, '当前账号没有管理端访问权限', null, 403);
    }

    request.user = { userId: session.userId, roles, permissions };
    return true;
  }
}
