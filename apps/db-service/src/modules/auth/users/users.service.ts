import { Injectable } from '@nestjs/common';
import type { Prisma } from '@/generated/prisma/client';
import { PERMISSION_CODE } from '@ai/constants/permissions';
import { RoleCode } from '@ai/constants/roles';
import { AUTH_ERROR, COMMON_ERROR, DATA_ERROR, USER_ERROR } from '@ai/constants/error-codes';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { PermissionsService } from '@/infra/permissions/permissions.service';
import { SessionService } from '@/infra/session/session.service';
import { hashPassword } from '@/infra/crypto/password';
import { logger } from '@/infra/logger/logger';
import {
  ACTIVE_STATUS_DATA,
  recoverExpiredPlatformUsers,
} from '@/infra/permissions/platform-user-status';
import { ApiException } from '@/common/http/api-exception';
import { assertGrantable, assertPermissions, isSuperAdmin } from '@/common/utils/permission';
import { getSettledValue } from '@/common/utils/settled';
import { isRecordNotFoundError, isUniqueConstraintError } from '@/common/utils/prisma-error';
import type {
  CreateUserInput,
  ListPlatformUsersQuery,
  ListUsersQuery,
  UpdatePlatformUserStatusInput,
  UpdateUserInput,
} from './schemas';

const { USER } = PERMISSION_CODE.OPERATION;

const userSelect = {
  id: true,
  account: true,
  username: true,
  nickname: true,
  avatar: true,
  remark: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  userRoles: { select: { role: { select: { code: true, id: true, name: true } } } },
} satisfies Prisma.SystemUserSelect;

const platformUserSelect = {
  id: true,
  email: true,
  nick_name: true,
  picture: true,
  bio: true,
  status: true,
  status_reason: true,
  status_expires_at: true,
  last_login_at: true,
  created_at: true,
  updated_at: true,
} satisfies Prisma.UsersSelect;

function serializeUser(user: Prisma.SystemUserGetPayload<{ select: typeof userSelect }>) {
  const { userRoles, ...rest } = user;
  return { ...rest, roles: userRoles.map((userRole) => userRole.role) };
}

/** 平台用户表沿用 snake_case 列名，对外统一成与系统用户一致的 camelCase */
function serializePlatformUser(
  user: Prisma.UsersGetPayload<{ select: typeof platformUserSelect }>,
) {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nick_name,
    avatar: user.picture,
    bio: user.bio,
    status: user.status,
    statusReason: user.status_reason,
    statusExpiresAt: user.status_expires_at,
    lastLoginAt: user.last_login_at,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

function hasSuperAdminRole(userRoles: Array<{ role: { code: string } }>): boolean {
  return userRoles.some((userRole) => userRole.role.code === RoleCode.SUPER_ADMIN);
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionsCache: PermissionsService,
    private readonly session: SessionService,
  ) {}

  async list(query: ListUsersQuery) {
    const { page, pageSize, skip, take, searchTerm, roleId } = query;
    const where: Prisma.SystemUserWhereInput = {
      AND: [
        ...(searchTerm
          ? [
              {
                OR: [
                  { account: { contains: searchTerm, mode: 'insensitive' as const } },
                  { username: { contains: searchTerm, mode: 'insensitive' as const } },
                  { nickname: { contains: searchTerm, mode: 'insensitive' as const } },
                ],
              },
            ]
          : []),
        ...(roleId ? [{ userRoles: { some: { roleId } } }] : []),
      ],
    };

    const [countResult, usersResult] = await Promise.allSettled([
      this.prisma.systemUser.count({ where }),
      this.prisma.systemUser.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: userSelect,
      }),
    ]);

    return {
      data: getSettledValue(usersResult).map(serializeUser),
      total: getSettledValue(countResult),
      page,
      pageSize,
    };
  }

  async create(body: CreateUserInput, currentUser: AuthUser) {
    const { account, password, username, nickname, avatar, remark, roleIds, status } = body;

    const [duplicateResult, rolesResult] = await Promise.allSettled([
      this.prisma.systemUser.findUnique({ where: { account }, select: { id: true } }),
      this.prisma.role.findMany({ where: { id: { in: roleIds } }, select: { code: true } }),
    ]);
    if (getSettledValue(duplicateResult)) {
      throw new ApiException(DATA_ERROR.DUPLICATE_ENTRY, '账号已存在', null, 409);
    }
    const roles = getSettledValue(rolesResult);
    if (roles.length !== roleIds.length) {
      throw new ApiException(COMMON_ERROR.PARAM_ERROR, '部分角色不存在', null, 400);
    }
    if (roles.some((role) => role.code === RoleCode.SUPER_ADMIN)) {
      throw new ApiException(
        COMMON_ERROR.PARAM_ERROR,
        '超级管理员角色只能通过 bootstrap 配置分配',
        null,
        400,
      );
    }
    // 建号时分配角色等于授出角色的全部权限，不能超出操作者自己的权限
    assertGrantable(
      await this.permissionsCache.findUngrantableRolePermissionCodes(currentUser, roleIds),
    );

    try {
      const created = await this.prisma.systemUser.create({
        data: {
          account,
          password: await hashPassword(password),
          username,
          nickname: nickname || username,
          avatar,
          remark,
          status,
          userRoles: { create: roleIds.map((roleId) => ({ roleId })) },
        },
        select: userSelect,
      });
      return serializeUser(created);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ApiException(DATA_ERROR.DUPLICATE_ENTRY, '账号已存在', null, 409);
      }
      throw error;
    }
  }

  async findOne(id: string) {
    const user = await this.prisma.systemUser.findUnique({ where: { id }, select: userSelect });
    if (!user) throw new ApiException(USER_ERROR.NOT_FOUND, undefined, null, 404);
    return serializeUser(user);
  }

  async update(id: string, body: UpdateUserInput, currentUser: AuthUser) {
    const existing = await this.prisma.systemUser.findUnique({
      where: { id },
      select: { status: true, userRoles: { select: { role: { select: { code: true } } } } },
    });
    if (!existing) throw new ApiException(USER_ERROR.NOT_FOUND, undefined, null, 404);

    const isTargetSuperAdmin = hasSuperAdminRole(existing.userRoles);
    // 非超管能改超管的资料或密码，就等于能接管超管账号
    if (isTargetSuperAdmin && !isSuperAdmin(currentUser)) {
      throw new ApiException(
        AUTH_ERROR.FORBIDDEN,
        '只有超级管理员可以修改超级管理员账号',
        null,
        403,
      );
    }

    // 重置密码是独立语义：带 password 时只改密码，不与资料字段混着更新
    if (body.password !== undefined) {
      assertPermissions(currentUser, [USER.RESET_PASSWORD]);
      await this.prisma.systemUser.update({
        where: { id },
        data: { password: await hashPassword(body.password) },
        select: { id: true },
      });
      // 密码被管理员重置后，该账号已登录的管理端会话全部作废；密码已落库，作废失败只记日志
      await this.session.destroyUserSessions(id, 'admin').catch((error: unknown) => {
        logger.error({ error, userId: id }, '[users] 重置密码后作废旧会话失败');
      });
      return { passwordReset: true as const, data: { id } };
    }

    const { status, account, username, nickname, avatar, remark } = body;
    const profile = { account, username, nickname, avatar, remark };
    const editsProfile = Object.values(profile).some((value) => value !== undefined);
    if (status === undefined && !editsProfile) {
      throw new ApiException(COMMON_ERROR.PARAM_ERROR, '没有可编辑的字段', null, 400);
    }

    // 资料与启停共用这个接口：按实际变更分别要求权限，列表页的启停开关只需要 USER_SET_STATE
    if (status !== undefined && status !== existing.status) {
      assertPermissions(currentUser, [USER.SET_STATE]);
    }
    if (editsProfile) {
      assertPermissions(currentUser, [USER.EDIT]);
    }

    // 会话守卫只放行 active：封禁、受限、待激活与停用一样会把人踢出后台，都不能作用在自己或超管身上
    if (status !== undefined && status !== 'active') {
      if (id === currentUser.userId) {
        throw new ApiException(COMMON_ERROR.PARAM_ERROR, '不能停用当前登录用户', null, 400);
      }
      if (isTargetSuperAdmin) {
        throw new ApiException(COMMON_ERROR.PARAM_ERROR, '超级管理员用户不能停用', null, 400);
      }
    }

    try {
      const user = await this.prisma.systemUser.update({
        where: { id },
        data: { ...profile, status },
        select: userSelect,
      });
      // 状态变更要立刻反映到鉴权链路上，否则被停用的用户还能继续用已有会话
      await this.permissionsCache.invalidateUserAuthCache(id);
      return { passwordReset: false as const, data: serializeUser(user) };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ApiException(DATA_ERROR.DUPLICATE_ENTRY, '账号已存在', null, 409);
      }
      throw error;
    }
  }

  /** 单个删除也走这里：整批要么全部删掉，要么一个都不删 */
  async removeMany(ids: string[], currentUser: AuthUser) {
    if (ids.includes(currentUser.userId)) {
      throw new ApiException(COMMON_ERROR.PARAM_ERROR, '不能删除当前登录用户', null, 400);
    }

    const users = await this.prisma.systemUser.findMany({
      where: { id: { in: ids } },
      select: { userRoles: { select: { role: { select: { code: true } } } } },
    });
    if (users.length !== ids.length) {
      throw new ApiException(USER_ERROR.NOT_FOUND, undefined, null, 404);
    }
    if (users.some((user) => hasSuperAdminRole(user.userRoles))) {
      throw new ApiException(COMMON_ERROR.PARAM_ERROR, '超级管理员用户不能删除', null, 400);
    }

    // user_roles 在库里是 ON DELETE CASCADE，只删用户本身即可
    await this.prisma.systemUser.deleteMany({ where: { id: { in: ids } } });

    // 用户已经删掉，会话与缓存的清理失败不回滚，只记日志：
    // 会话守卫最长在一个缓存 TTL（5 分钟）后发现账号不存在
    const cleanups = await Promise.allSettled(
      ids.flatMap((id) => [
        this.permissionsCache.invalidateUserAuthCache(id),
        this.session.destroyUserSessions(id, 'admin'),
      ]),
    );
    cleanups.forEach((result) => {
      if (result.status === 'rejected') {
        logger.warn({ error: result.reason }, '[users] 删除系统用户后清理会话或缓存失败');
      }
    });
    return { ids };
  }

  async listPlatformUsers(query: ListPlatformUsersQuery) {
    const { page, pageSize, skip, take, searchTerm, status } = query;
    const where: Prisma.UsersWhereInput = {
      is_deleted: false,
      ...(status ? { status } : {}),
      ...(searchTerm
        ? {
            OR: [
              { email: { contains: searchTerm, mode: 'insensitive' } },
              { nick_name: { contains: searchTerm, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    // 先把到期的受限 / 封禁恢复掉，否则按状态筛选会把已经到期的用户也筛出来
    await recoverExpiredPlatformUsers(this.prisma);

    const [countResult, usersResult] = await Promise.allSettled([
      this.prisma.users.count({ where }),
      this.prisma.users.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
        select: platformUserSelect,
      }),
    ]);

    return {
      data: getSettledValue(usersResult).map(serializePlatformUser),
      total: getSettledValue(countResult),
      page,
      pageSize,
    };
  }

  async updatePlatformUserStatus(id: string, body: UpdatePlatformUserStatusInput) {
    const { status, reason, expiresAt } = body;
    const data: Prisma.UsersUpdateInput =
      status === 'active'
        ? { ...ACTIVE_STATUS_DATA, updated_at: new Date() }
        : {
            status,
            status_reason: reason,
            // 停用不支持期限；schema 已拦截，这里再兜底一次
            status_expires_at: status === 'inactive' ? null : expiresAt,
            updated_at: new Date(),
          };

    let user;
    try {
      user = await this.prisma.users.update({
        where: { id, is_deleted: false },
        data,
        select: platformUserSelect,
      });
    } catch (error) {
      if (isRecordNotFoundError(error)) {
        throw new ApiException(USER_ERROR.NOT_FOUND, undefined, null, 404);
      }
      throw error;
    }

    // 会话守卫按缓存复核账号状态，不清缓存的话封禁要等 TTL 过期才会把人踢下线
    await this.permissionsCache.invalidateUserAuthCache(id, 'user');
    return serializePlatformUser(user);
  }
}
