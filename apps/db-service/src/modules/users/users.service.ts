import { Injectable } from '@nestjs/common';
import type { Prisma } from '@/generated/prisma/client';
import { RoleCode } from '@ai/constants/roles';
import { AUTH_ERROR, COMMON_ERROR, DATA_ERROR } from '@ai/constants/error-codes';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { PermissionsService } from '@/infra/permissions/permissions.service';
import { SessionService } from '@/infra/session/session.service';
import { getActiveUserRoleWhere } from '@/infra/permissions/user-roles';
import { logger } from '@/infra/logger/logger';
import { ApiException } from '@/common/http/api-exception';
import { getSettledValue } from '@/common/utils/settled';
import { isRecordNotFoundError, isUniqueConstraintError } from '@/common/utils/prisma-error';
import type { AdminUpdateUserInput, ListUsersQuery, PlatformUpdateUserInput } from './schemas';

const profileRoleSelect = {
  role: {
    select: { code: true, id: true, name: true, description: true, status: true },
  },
} satisfies Prisma.UserRolesSelect;

function serializeDate(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
    private readonly session: SessionService,
  ) {}

  async list(query: ListUsersQuery) {
    const { page, pageSize, skip, take, searchTerm, role, status } = query;
    const where: Prisma.UsersWhereInput = {
      is_deleted: false,
      ...(status ? { status } : {}),
      ...(searchTerm
        ? {
            OR: [
              { full_name: { contains: searchTerm, mode: 'insensitive' } },
              { nick_name: { contains: searchTerm, mode: 'insensitive' } },
              { user_name: { contains: searchTerm, mode: 'insensitive' } },
              { email: { contains: searchTerm, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(role
        ? {
            user_roles: {
              some: { ...getActiveUserRoleWhere(), role: { code: role, status: 'ENABLED' } },
            },
          }
        : {}),
    };

    const [totalResult, usersResult] = await Promise.allSettled([
      this.prisma.users.count({ where }),
      this.prisma.users.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
        include: {
          user_roles: { where: getActiveUserRoleWhere(), select: profileRoleSelect },
        },
      }),
    ]);
    const total = getSettledValue(totalResult);
    const users = getSettledValue(usersResult);

    const data = users.map((user) => ({
      id: user.id,
      full_name: user.full_name,
      nick_name: user.nick_name,
      user_name: user.user_name,
      picture: user.picture,
      email: user.email,
      email_verified: user.email_verified,
      status: user.status,
      last_login_at: serializeDate(user.last_login_at),
      created_at: user.created_at.toISOString(),
      roles: user.user_roles.map((userRole) => userRole.role),
    }));

    return { data, total, page, pageSize };
  }

  /**
   * 用户资料。
   *
   * @param exposeEmail 是否返回邮箱。后台与本人可见；前台查看他人资料时隐去邮箱，
   *                    迁移前这个接口没有任何鉴权，任何人都能按 id 拿到他人邮箱。
   */
  async getProfile(userId: string, currentUserId: string | undefined, exposeEmail: boolean) {
    const user = await this.prisma.users.findFirst({
      where: { id: userId, is_deleted: false },
      include: {
        user_roles: { where: getActiveUserRoleWhere(), select: profileRoleSelect },
      },
    });
    if (!user) return null;

    const isMe = currentUserId === user.id;
    return {
      id: user.id,
      full_name: user.full_name,
      nick_name: user.nick_name,
      user_name: user.user_name,
      picture: user.picture,
      email: exposeEmail || isMe ? user.email : null,
      email_verified: user.email_verified,
      bio: user.bio,
      status: user.status,
      is_me: isMe,
      last_login_at: serializeDate(user.last_login_at),
      created_at: user.created_at.toISOString(),
      updated_at: user.updated_at.toISOString(),
      roles: user.user_roles.map((userRole) => userRole.role),
    };
  }

  async getProfileOrThrow(userId: string, currentUserId: string | undefined, exposeEmail: boolean) {
    const profile = await this.getProfile(userId, currentUserId, exposeEmail);
    if (!profile) {
      throw new ApiException(DATA_ERROR.NOT_FOUND, '用户不存在', null, 404);
    }
    return profile;
  }

  private async isSuperAdminUser(userId: string): Promise<boolean> {
    const role = await this.prisma.userRoles.findFirst({
      where: {
        user_id: userId,
        revoked_at: null,
        role: { code: RoleCode.SUPER_ADMIN, status: 'ENABLED' },
      },
      select: { id: true },
    });
    return Boolean(role);
  }

  /**
   * 管理员编辑用户：资料、状态、角色。
   *
   * 规则沿用迁移前 PUT /api/users/:id：SUPER_ADMIN 用户只有 SUPER_ADMIN 能改；
   * SUPER_ADMIN 的角色绑定、以及授予 SUPER_ADMIN 都不能走接口，只能 bootstrap；
   * 角色必须存在且已启用；旧的角色授权标记撤销而不是物理删除，保留审计痕迹。
   */
  async adminUpdate(userId: string, body: AdminUpdateUserInput, currentUser: AuthUser) {
    const { roleIds, status, ...profile } = body;
    const isOperatorSuperAdmin = currentUser.roles.includes(RoleCode.SUPER_ADMIN);
    const isTargetSuperAdmin = await this.isSuperAdminUser(userId);

    if (isTargetSuperAdmin && !isOperatorSuperAdmin) {
      throw new ApiException(AUTH_ERROR.FORBIDDEN, '不可操作 SUPER_ADMIN 用户', null, 403);
    }
    // 会话守卫只放行 active，自己把自己停掉会立刻被踢出后台
    if (status !== undefined && status !== 'active' && userId === currentUser.userId) {
      throw new ApiException(COMMON_ERROR.PARAM_ERROR, '不能停用当前登录用户', null, 400);
    }

    const data: Prisma.UsersUpdateInput = { updated_at: new Date() };
    for (const [key, value] of Object.entries(profile)) {
      if (value !== undefined) (data as Record<string, unknown>)[key] = value;
    }
    if (status !== undefined) data.status = status;

    try {
      await this.prisma.$transaction(async (tx) => {
        if (roleIds !== undefined) {
          if (isTargetSuperAdmin) {
            throw new ApiException(
              DATA_ERROR.VALIDATION_FAILED,
              'SUPER_ADMIN 的角色绑定关系不可通过普通 API 修改',
              null,
              403,
            );
          }

          const selectedRoles = await tx.roles.findMany({
            where: { id: { in: roleIds } },
            select: { code: true, id: true, status: true },
          });
          if (selectedRoles.length !== roleIds.length) {
            throw new ApiException(DATA_ERROR.VALIDATION_FAILED, '一个或多个角色不存在', null, 422);
          }
          if (selectedRoles.some((role) => role.code === RoleCode.SUPER_ADMIN)) {
            throw new ApiException(
              DATA_ERROR.VALIDATION_FAILED,
              'SUPER_ADMIN 的角色绑定关系不可通过普通 API 修改',
              null,
              403,
            );
          }
          if (selectedRoles.some((role) => role.status !== 'ENABLED')) {
            throw new ApiException(DATA_ERROR.VALIDATION_FAILED, '一个或多个角色已禁用', null, 422);
          }

          const now = new Date();
          await tx.userRoles.updateMany({
            where: { user_id: userId, revoked_at: null },
            data: { revoked_at: now, revoked_by: currentUser.userId, updated_at: now },
          });
          if (roleIds.length > 0) {
            await tx.userRoles.createMany({
              data: roleIds.map((roleId) => ({
                user_id: userId,
                role_id: roleId,
                assigned_by: currentUser.userId,
                assigned_at: now,
                updated_at: now,
              })),
            });
          }
        }

        await tx.users.update({ where: { id: userId }, data });
      });
    } catch (error) {
      if (error instanceof ApiException) throw error;
      if (isUniqueConstraintError(error)) {
        throw new ApiException(DATA_ERROR.DUPLICATE_ENTRY, '用户名已被使用', null, 409);
      }
      if (isRecordNotFoundError(error)) {
        throw new ApiException(DATA_ERROR.NOT_FOUND, '用户不存在', null, 404);
      }
      throw new ApiException(DATA_ERROR.UPDATE_FAILED, '用户更新失败', error, 500);
    }

    // 角色与状态变更要立刻反映到鉴权链路上
    await this.permissions.invalidateUserAuthCache(userId);
    if (status !== undefined && status !== 'active') {
      await this.revokeAllSessions(userId);
    }

    return this.getProfileOrThrow(userId, currentUser.userId, true);
  }

  /** 被停用 / 封禁的账号，两端已有会话一并作废；状态已落库，作废失败只记日志 */
  private async revokeAllSessions(userId: string): Promise<void> {
    const results = await Promise.allSettled([
      this.session.destroyUserSessions(userId, 'user'),
      this.session.destroyUserSessions(userId, 'admin'),
    ]);
    results.forEach((result) => {
      if (result.status === 'rejected') {
        logger.warn({ error: result.reason, userId }, '[users] 停用账号后作废会话失败');
      }
    });
  }

  /** 用户在前台编辑自己的资料 */
  async updateOwnProfile(userId: string, body: PlatformUpdateUserInput, currentUser: AuthUser) {
    if (userId !== currentUser.userId) {
      throw new ApiException(AUTH_ERROR.FORBIDDEN, '无权修改其他用户资料', null, 403);
    }

    const data: Prisma.UsersUpdateInput = { updated_at: new Date() };
    if (body.nick_name !== undefined) data.nick_name = body.nick_name;
    if (body.bio !== undefined) data.bio = body.bio;

    try {
      await this.prisma.users.update({ where: { id: userId }, data, select: { id: true } });
    } catch (error) {
      if (isRecordNotFoundError(error)) {
        throw new ApiException(DATA_ERROR.NOT_FOUND, '用户不存在', null, 404);
      }
      throw new ApiException(DATA_ERROR.UPDATE_FAILED, '用户更新失败', error, 500);
    }

    return this.getProfileOrThrow(userId, currentUser.userId, true);
  }
}
