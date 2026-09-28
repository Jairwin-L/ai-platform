import { Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Prisma } from '@/generated/prisma/client';
import { AUTH_ERROR, COMMON_ERROR, DATA_ERROR, USER_ERROR } from '@ai/constants/error-codes';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { ID_PREFIX, createId } from '@/lib/id';
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
import {
  getEffectiveStatusFields,
  recoverExpiredPlatformUsers,
} from '@/infra/permissions/platform-user-status';
import { ApiException } from '@/common/http/api-exception';
import { getAccountStatusMessage } from '@/common/http/account-status-message';
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
  status_reason: true,
  status_expires_at: true,
  is_deleted: true,
} satisfies Prisma.UsersSelect;

type AuthUserRow = Prisma.UsersGetPayload<{ select: typeof authUserSelect }>;

/** 登录只做认证，账号资料由管理端随后请求 /auth/me 获取 */
const systemLoginSelect = {
  id: true,
  password: true,
  status: true,
} satisfies Prisma.SystemUserSelect;

const systemAccountSelect = {
  id: true,
  account: true,
  username: true,
  nickname: true,
  avatar: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SystemUserSelect;

/**
 * 平台用户的登录态：平台用户没有角色体系，不再返回角色与权限码；
 * 受限用户能登录，前台靠状态、原因与截止时间提示「为什么不能操作」。
 */
function toAuthPayload(user: AuthUserRow) {
  return {
    user: {
      id: user.id,
      email: user.email,
      emailVerified: user.email_verified,
      nickName: user.nick_name,
      picture: user.picture,
      ...getEffectiveStatusFields(user),
    },
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
   * 平台用户能否登录：到期的限制 / 封禁先惰性恢复；受限用户仍可登录浏览，写操作由 SessionGuard 拦截，
   * 其余非正常状态拒绝，并把后台填写的原因与解除时间告诉用户本人。
   */
  private async assertPlatformUserCanSignIn(user: AuthUserRow): Promise<void> {
    if (user.is_deleted) {
      throw new ApiException(AUTH_ERROR.FORBIDDEN, '账号不可用', null, 403);
    }

    const effective = getEffectiveStatusFields(user);
    if (effective.status !== user.status) {
      await recoverExpiredPlatformUsers(this.prisma, { id: user.id });
      await this.permissions.invalidateUserAuthCache(user.id, 'user');
    }
    if (effective.status !== 'active' && effective.status !== 'restricted') {
      throw new ApiException(
        AUTH_ERROR.ACCOUNT_DISABLED,
        getAccountStatusMessage(effective.status, {
          reason: effective.statusReason,
          expiresAt: effective.statusExpiresAt,
        }),
        null,
        403,
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
      await this.assertPlatformUserCanSignIn(user);
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

    try {
      // 平台注册用户不挂角色：角色体系只属于管理端的系统用户
      await this.prisma.users.create({
        data: {
          id: createId(ID_PREFIX.user),
          email,
          email_verified: true,
          password_hash: await hashPassword(body.password),
          status: 'active',
        },
        select: { id: true },
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
   * 密码错误与验证码错误统一 401，并对账号维度限流。账号状态检查放在凭证校验之后，
   * 否则未通过认证的人也能探测出某个邮箱已被封禁。
   */
  async signIn(body: SignInInput, response: Response) {
    const email = normalizeEmail(body.email);
    await this.consumeAccountRateLimit(email, SIGN_IN_ACCOUNT_RATE_LIMIT);

    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new ApiException(DATA_ERROR.NOT_FOUND, '该邮箱未注册', null, 404);
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

    await this.assertPlatformUserCanSignIn(user);

    const signedIn = await this.prisma.users.update({
      where: { id: user.id },
      data: { last_login_at: new Date(), updated_at: new Date() },
      select: authUserSelect,
    });

    const sessionId = await this.session.createSession(
      { userId: user.id, createdAt: Date.now() },
      'user',
    );
    this.session.setSessionCookie(response, sessionId, 'user');

    return toAuthPayload(signedIn);
  }

  async signOut(request: Request, response: Response, realm: SessionRealm): Promise<null> {
    const sessionId = request.cookies?.[getSessionCookieName(realm)];
    if (sessionId) {
      await this.session.destroySession(sessionId, realm);
    }
    this.session.clearSessionCookie(response, realm);
    return null;
  }

  /** 前台当前登录用户：守卫已复核账号状态，这里只补资料字段 */
  async getAuthPayload(user: AuthUser) {
    const dbUser = await this.prisma.users.findUnique({
      where: { id: user.userId },
      select: authUserSelect,
    });
    if (!dbUser || dbUser.is_deleted) {
      throw new ApiException(AUTH_ERROR.UNAUTHORIZED, undefined, null, 401);
    }
    return toAuthPayload(dbUser);
  }

  /** 管理端当前登录的系统账号：守卫已解出会话并算好角色权限（走缓存），这里只补资料字段 */
  async getCurrentSystemAccount(user: AuthUser) {
    const systemUser = await this.prisma.systemUser.findUnique({
      where: { id: user.userId },
      select: systemAccountSelect,
    });
    if (!systemUser) {
      throw new ApiException(USER_ERROR.NOT_FOUND, undefined, null, 404);
    }

    return {
      ...systemUser,
      roles: user.roles,
      permissions: user.permissions,
    };
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

    // 改密后作废该账号的全部前台会话，与迁移前「撤销全部 session 并要求重新登录」一致；
    // 管理端是独立的系统用户账号，不受影响。密码已经落库，作废失败只记日志
    await this.session.destroyUserSessions(user.userId, 'user').catch((error: unknown) => {
      logger.error({ error, userId: user.userId }, '[auth] 改密后作废会话失败');
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
   * 管理端登录：只负责认证与下发 admin 会话 Cookie，账号信息由随后的 /auth/me 给出。
   *
   * 账号不存在与密码错误统一返回同一个 401，且都消耗一次等价的 scrypt 计算，
   * 避免通过响应码或耗时枚举后台账号；状态与角色检查放在密码校验之后。
   */
  async adminLogin(body: AdminLoginInput, response: Response): Promise<null> {
    const password = this.resolveAdminPassword(body.password, body.encrypted);

    await this.consumeAccountRateLimit(body.account.toLowerCase(), ADMIN_LOGIN_ACCOUNT_RATE_LIMIT);

    const user = await this.prisma.systemUser.findUnique({
      where: { account: body.account },
      select: systemLoginSelect,
    });
    if (!user) {
      await burnPasswordVerification(password);
      throw new ApiException(AUTH_ERROR.LOGIN_FAILED, '账号或密码错误', null, 401);
    }
    if (!(await verifyPassword(password, user.password))) {
      throw new ApiException(AUTH_ERROR.LOGIN_FAILED, '账号或密码错误', null, 401);
    }
    if (user.status !== 'active') {
      throw new ApiException(AUTH_ERROR.ACCOUNT_DISABLED, undefined, null, 403);
    }

    // 持有任一已启用的系统角色即可登录；能看到哪些菜单、调用哪些接口由权限码决定。
    // 没有角色或角色全被停用的账号进不了管理端
    const { canAccessAdmin } = await this.permissions.getUserRolesAndPermissions(user.id, 'admin');
    if (!canAccessAdmin) {
      throw new ApiException(AUTH_ERROR.FORBIDDEN, '当前账号没有管理端访问权限', null, 403);
    }

    await this.prisma.systemUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
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
