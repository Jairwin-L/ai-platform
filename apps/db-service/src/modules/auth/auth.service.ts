import crypto from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import { RoleCode } from '@ai/constants/roles';
import { SITE_PERMISSION_CODES } from '@ai/constants/permissions';
import { AUTH_ERROR, COMMON_ERROR, DATA_ERROR } from '@ai/constants/error-codes';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { PermissionsService } from '@/infra/permissions/permissions.service';
import {
  SessionService,
  getSessionCookieName,
  type SessionRealm,
} from '@/infra/session/session.service';
import { RateLimitService, type RateLimitRule } from '@/infra/rate-limit/rate-limit.service';
import {
  VerificationCodeService,
  normalizeEmail,
  type VerificationPurpose,
} from '@/infra/verification/verification-code.service';
import { buildVerificationCodeEmail } from '@/infra/verification/verification-email';
import { MailService } from '@/infra/mail/mail.service';
import {
  burnPasswordVerification,
  hashPassword,
  isSupportedPasswordHash,
  verifyPassword,
} from '@/infra/crypto/password';
import { decryptLoginPassword, getLoginRsaPublicKey } from '@/infra/crypto/login-rsa';
import { logger } from '@/infra/logger/logger';
import { ApiException } from '@/common/http/api-exception';
import { isUniqueConstraintError } from '@/common/utils/prisma-error';
import type {
  AdminLoginInput,
  RequestVerificationCodeInput,
  ResetPasswordInput,
  SignInInput,
  SignUpInput,
} from './schemas';

// 单账号维度的限流：IP 维度已在守卫里拦过一层，这里防分布式 IP 针对同一账号爆破
const SIGN_IN_ACCOUNT_RATE_LIMIT: RateLimitRule = {
  scope: 'auth:sign-in:account',
  windowSeconds: 15 * 60,
  max: 10,
};
const ADMIN_LOGIN_ACCOUNT_RATE_LIMIT: RateLimitRule = {
  scope: 'auth:admin-login:account',
  windowSeconds: 15 * 60,
  max: 8,
};
const SEND_CODE_EMAIL_RATE_LIMIT: RateLimitRule = {
  scope: 'auth:send-code:email',
  windowSeconds: 60 * 60,
  max: 5,
};

const authUserSelect = {
  id: true,
  email: true,
  email_verified: true,
  nick_name: true,
  picture: true,
  status: true,
  is_deleted: true,
} as const;

interface AuthUserRow {
  id: string;
  email: string | null;
  email_verified: boolean | null;
  nick_name: string | null;
  picture: string | null;
  status: string;
}

/** 与迁移前 /api/me、/api/sign-in 返回的 AuthPayload 结构保持一致 */
function toAuthPayload(user: AuthUserRow, roles: string[], permissions: string[]) {
  return {
    user: {
      id: user.id,
      email: user.email,
      emailVerified: user.email_verified,
      nickName: user.nick_name,
      picture: user.picture,
      status: user.status,
    },
    roles,
    permissions,
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
    private readonly session: SessionService,
    private readonly rateLimit: RateLimitService,
    private readonly verificationCode: VerificationCodeService,
    private readonly mail: MailService,
  ) {}

  getLoginPublicKey(): string {
    return getLoginRsaPublicKey();
  }

  private async consumeAccountRateLimit(identifier: string, rule: RateLimitRule): Promise<void> {
    const result = await this.rateLimit.consume(identifier, rule);
    if (!result.allowed) {
      throw new ApiException(
        COMMON_ERROR.RATE_LIMIT,
        `尝试过于频繁，请 ${result.retryAfterSeconds} 秒后重试`,
        null,
        429,
      );
    }
  }

  private findUserByEmail(email: string) {
    return this.prisma.users.findUnique({
      where: { email },
      select: { ...authUserSelect, password_hash: true },
    });
  }

  private async issueAndSendCode(email: string, purpose: VerificationPurpose): Promise<void> {
    const code = await this.verificationCode.issue(email, purpose);

    try {
      await this.mail.sendEmail({ to: email, ...buildVerificationCodeEmail(purpose, code) });
    } catch (error) {
      // 发信失败时不能再提示「已发送」，否则用户只能干等一封收不到的邮件
      await this.verificationCode.revoke(email, purpose).catch(() => undefined);
      logger.error({ error, purpose }, '[auth] 验证码邮件发送失败');
      throw new ApiException(
        COMMON_ERROR.SERVICE_UNAVAILABLE,
        '验证码邮件发送失败，请稍后重试',
        null,
        503,
      );
    }
  }

  /**
   * 登录 / 注册验证码。注册时邮箱已存在直接 409；登录时邮箱未注册 404、账号不可用 403，
   * 与迁移前 /api/code 的行为保持一致。
   */
  async sendVerificationCode(body: RequestVerificationCodeInput): Promise<null> {
    const email = normalizeEmail(body.email);
    await this.consumeAccountRateLimit(email, SEND_CODE_EMAIL_RATE_LIMIT);

    const user = await this.findUserByEmail(email);

    if (body.purpose === 'sign-up' && user) {
      throw new ApiException(DATA_ERROR.DUPLICATE_ENTRY, '该邮箱已注册', null, 409);
    }

    if (body.purpose === 'sign-in') {
      if (!user) {
        throw new ApiException(DATA_ERROR.NOT_FOUND, '该邮箱未注册', null, 404);
      }
      if (user.is_deleted || user.status !== 'active') {
        throw new ApiException(AUTH_ERROR.FORBIDDEN, '账号不可用', null, 403);
      }
    }

    await this.issueAndSendCode(email, body.purpose);
    return null;
  }

  async signUp(body: SignUpInput): Promise<null> {
    const email = normalizeEmail(body.email);
    const existing = await this.findUserByEmail(email);
    if (existing) {
      throw new ApiException(DATA_ERROR.DUPLICATE_ENTRY, '该邮箱已注册', null, 409);
    }

    // 先查重再核销验证码：邮箱已被占用时不该白白消耗掉一个还能用的验证码
    if (!(await this.verificationCode.consume(email, 'sign-up', body.code))) {
      throw new ApiException(COMMON_ERROR.VALIDATION_ERROR, '验证码无效或已过期', null, 422);
    }

    const passwordHash = await hashPassword(body.password);

    try {
      await this.prisma.$transaction(async (tx) => {
        const siteRole = await tx.roles.upsert({
          where: { code: RoleCode.SITE_USER },
          update: { updated_at: new Date() },
          create: {
            code: RoleCode.SITE_USER,
            name: '站点用户',
            description: '默认拥有站点全部功能权限',
            is_system: true,
            status: 'ENABLED',
          },
        });
        const user = await tx.users.create({
          data: {
            id: crypto.randomUUID(),
            email,
            email_verified: true,
            password_hash: passwordHash,
            status: 'active',
          },
        });
        await tx.userRoles.create({ data: { user_id: user.id, role_id: siteRole.id } });
      });
    } catch (error) {
      // 查重与创建之间被并发注册抢先，按邮箱已存在处理，而不是报 500
      if (isUniqueConstraintError(error)) {
        throw new ApiException(DATA_ERROR.DUPLICATE_ENTRY, '该邮箱已注册', null, 409);
      }
      throw error;
    }

    return null;
  }

  /**
   * 前台登录：密码或邮箱验证码两种方式。
   *
   * 账号不存在返回 404「该邮箱未注册」是迁移前的既有交互（登录页据此引导注册），这里保留；
   * 密码错误与验证码错误统一 401，并对账号维度限流。
   */
  async signIn(body: SignInInput, response: Response) {
    const email = normalizeEmail(body.email);
    await this.consumeAccountRateLimit(email, SIGN_IN_ACCOUNT_RATE_LIMIT);

    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new ApiException(DATA_ERROR.NOT_FOUND, '该邮箱未注册', null, 404);
    }
    if (user.is_deleted || user.status !== 'active') {
      throw new ApiException(AUTH_ERROR.FORBIDDEN, '账号不可用', null, 403);
    }

    if (body.method === 'password') {
      if (!isSupportedPasswordHash(user.password_hash)) {
        await burnPasswordVerification(body.password);
        throw new ApiException(
          AUTH_ERROR.UNAUTHORIZED,
          '账号未设置可用密码，请使用验证码登录或重置密码',
          null,
          401,
        );
      }
      if (!(await verifyPassword(body.password, user.password_hash))) {
        throw new ApiException(AUTH_ERROR.UNAUTHORIZED, '邮箱或登录凭证错误', null, 401);
      }
    } else if (!(await this.verificationCode.consume(email, 'sign-in', body.code))) {
      throw new ApiException(AUTH_ERROR.UNAUTHORIZED, '邮箱或登录凭证错误', null, 401);
    }

    // 迁移前每次鉴权都会顺手补齐站点角色，这里收敛到登录时补一次
    if (await this.ensureSiteRoleForUser(user.id)) {
      await this.permissions.invalidateUserAuthCache(user.id);
    }

    await this.prisma.users.update({
      where: { id: user.id },
      data: { last_login_at: new Date(), updated_at: new Date() },
      select: { id: true },
    });

    const sessionId = await this.session.createSession(
      { userId: user.id, createdAt: Date.now() },
      'user',
    );
    this.session.setSessionCookie(response, sessionId, 'user');

    const { roles, permissions } = await this.permissions.getUserRolesAndPermissions(user.id);
    return toAuthPayload(user, roles, permissions);
  }

  /**
   * 保证用户持有 SITE_USER 角色、该角色持有全部站点权限。
   *
   * @returns 是否有改动（有改动时调用方要失效权限缓存）
   */
  private async ensureSiteRoleForUser(userId: string): Promise<boolean> {
    let changed = false;
    const siteRole = await this.prisma.roles.upsert({
      where: { code: RoleCode.SITE_USER },
      update: {},
      create: {
        code: RoleCode.SITE_USER,
        name: '站点用户',
        description: '默认拥有站点全部功能权限',
        is_system: true,
        status: 'ENABLED',
      },
      select: { id: true },
    });

    const sitePermissions = await this.prisma.permissions.findMany({
      where: { code: { in: SITE_PERMISSION_CODES } },
      select: { id: true },
    });
    if (sitePermissions.length > 0) {
      const existing = await this.prisma.rolePermissions.findMany({
        where: {
          role_id: siteRole.id,
          permission_id: { in: sitePermissions.map((permission) => permission.id) },
        },
        select: { permission_id: true },
      });
      const existingIds = new Set(existing.map((item) => item.permission_id));
      const missing = sitePermissions.filter((permission) => !existingIds.has(permission.id));
      if (missing.length > 0) {
        await this.prisma.rolePermissions.createMany({
          data: missing.map((permission) => ({
            role_id: siteRole.id,
            permission_id: permission.id,
          })),
          skipDuplicates: true,
        });
        // 角色权限变化影响所有站点用户
        await this.permissions.invalidateAllAuthCache();
        changed = true;
      }
    }

    const assigned = await this.prisma.userRoles.findFirst({
      where: { user_id: userId, role_id: siteRole.id, revoked_at: null },
      select: { id: true },
    });
    if (!assigned) {
      await this.prisma.userRoles.create({ data: { user_id: userId, role_id: siteRole.id } });
      changed = true;
    }

    return changed;
  }

  async signOut(request: Request, response: Response, realm: SessionRealm): Promise<null> {
    const sessionId = request.cookies?.[getSessionCookieName(realm)];
    if (sessionId) {
      await this.session.destroySession(sessionId, realm);
    }
    this.session.clearSessionCookie(response, realm);
    return null;
  }

  /** 当前登录用户：守卫已复核账号状态并算好角色权限，这里只补资料字段 */
  async getAuthPayload(user: AuthUser) {
    const dbUser = await this.prisma.users.findUnique({
      where: { id: user.userId },
      select: authUserSelect,
    });
    if (!dbUser || dbUser.is_deleted) {
      throw new ApiException(AUTH_ERROR.UNAUTHORIZED, undefined, null, 401);
    }
    return toAuthPayload(dbUser, user.roles, user.permissions);
  }

  /** 已登录用户重置密码：验证码发往账号绑定的邮箱 */
  async sendResetPasswordCode(user: AuthUser): Promise<null> {
    const email = await this.getUserEmail(user.userId);
    await this.consumeAccountRateLimit(email, SEND_CODE_EMAIL_RATE_LIMIT);
    await this.issueAndSendCode(email, 'reset-password');
    return null;
  }

  async resetPassword(user: AuthUser, body: ResetPasswordInput, response: Response): Promise<null> {
    const email = await this.getUserEmail(user.userId);

    if (!(await this.verificationCode.consume(email, 'reset-password', body.code))) {
      throw new ApiException(COMMON_ERROR.VALIDATION_ERROR, '验证码无效或已过期', null, 422);
    }

    await this.prisma.users.update({
      where: { id: user.userId },
      data: { password_hash: await hashPassword(body.password), updated_at: new Date() },
      select: { id: true },
    });

    // 改密后作废该账号在两端的全部会话，与迁移前「撤销全部 session 并要求重新登录」一致；
    // 密码已经落库，作废失败只记日志
    const results = await Promise.allSettled([
      this.session.destroyUserSessions(user.userId, 'user'),
      this.session.destroyUserSessions(user.userId, 'admin'),
    ]);
    results.forEach((result) => {
      if (result.status === 'rejected') {
        logger.error({ error: result.reason, userId: user.userId }, '[auth] 改密后作废会话失败');
      }
    });
    this.session.clearSessionCookie(response, 'user');
    return null;
  }

  private async getUserEmail(userId: string): Promise<string> {
    const dbUser = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!dbUser?.email) {
      throw new ApiException(COMMON_ERROR.VALIDATION_ERROR, '当前账号未绑定邮箱', null, 422);
    }
    return normalizeEmail(dbUser.email);
  }

  /** 解开前端 RSA 加密的登录密码；密文非法时按参数错误处理 */
  private resolveAdminPassword(rawPassword: string, encrypted?: boolean): string {
    if (!encrypted) return rawPassword;
    try {
      return decryptLoginPassword(rawPassword);
    } catch {
      throw new ApiException(COMMON_ERROR.PARAM_ERROR, '密码密文无效', null, 400);
    }
  }

  /**
   * 管理后台登录：只负责认证与下发 admin 会话 Cookie，账号信息由随后的 /auth/me 给出。
   *
   * 账号不存在、没有密码、密码错误统一返回同一个 401，且都消耗一次等价的 scrypt 计算，
   * 避免通过响应码或耗时枚举后台账号；状态与角色检查放在密码校验之后。
   */
  async adminLogin(body: AdminLoginInput, response: Response): Promise<null> {
    const email = normalizeEmail(body.email);
    const password = this.resolveAdminPassword(body.password, body.encrypted);

    await this.consumeAccountRateLimit(email, ADMIN_LOGIN_ACCOUNT_RATE_LIMIT);

    const user = await this.findUserByEmail(email);
    if (!user || !isSupportedPasswordHash(user.password_hash)) {
      await burnPasswordVerification(password);
      throw new ApiException(AUTH_ERROR.LOGIN_FAILED, '账号或密码错误', null, 401);
    }
    if (!(await verifyPassword(password, user.password_hash))) {
      throw new ApiException(AUTH_ERROR.LOGIN_FAILED, '账号或密码错误', null, 401);
    }
    if (user.is_deleted || user.status !== 'active') {
      throw new ApiException(AUTH_ERROR.ACCOUNT_DISABLED, undefined, null, 403);
    }

    const { canAccessAdmin } = await this.permissions.getUserRolesAndPermissions(user.id);
    if (!canAccessAdmin) {
      throw new ApiException(AUTH_ERROR.FORBIDDEN, '当前账号没有管理后台访问权限', null, 403);
    }

    await this.prisma.users.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
      select: { id: true },
    });
    const sessionId = await this.session.createSession(
      { userId: user.id, createdAt: Date.now() },
      'admin',
    );
    this.session.setSessionCookie(response, sessionId, 'admin');
    return null;
  }
}
