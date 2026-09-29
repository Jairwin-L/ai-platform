import { Injectable } from '@nestjs/common';
import type { Prisma } from '@/generated/prisma/client';
import { AUTH_ERROR, DATA_ERROR } from '@ai/constants/error-codes';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { ApiException } from '@/common/http/api-exception';
import { isRecordNotFoundError } from '@/common/utils/prisma-error';
import type { PlatformUpdateUserInput } from './schemas';

function serializeDate(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

/** 平台用户资料；平台用户没有角色体系，这里只有资料字段 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 用户资料。邮箱只对本人可见：迁移前这个接口没有任何鉴权，任何人都能按 id 拿到他人邮箱。
   */
  async getProfile(userId: string, currentUserId: string | undefined) {
    const user = await this.prisma.users.findFirst({
      where: { id: userId, is_deleted: false },
    });
    if (!user) return null;

    const isMe = currentUserId === user.id;
    return {
      id: user.id,
      full_name: user.full_name,
      nick_name: user.nick_name,
      user_name: user.user_name,
      picture: user.picture,
      email: isMe ? user.email : null,
      email_verified: user.email_verified,
      bio: user.bio,
      status: user.status,
      is_me: isMe,
      last_login_at: serializeDate(user.last_login_at),
      created_at: user.created_at.toISOString(),
      updated_at: user.updated_at.toISOString(),
    };
  }

  async getProfileOrThrow(userId: string, currentUserId: string | undefined) {
    const profile = await this.getProfile(userId, currentUserId);
    if (!profile) {
      throw new ApiException(DATA_ERROR.NOT_FOUND, '用户不存在', null, 404);
    }
    return profile;
  }

  /** 用户在前台编辑自己的资料；受限用户的写请求已被 SessionGuard 拦下 */
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

    return this.getProfileOrThrow(userId, currentUser.userId);
  }
}
