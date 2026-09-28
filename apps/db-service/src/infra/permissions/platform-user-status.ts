/**
 * @file 平台用户限制 / 封禁状态的到期口径。
 *       带期限的受限 / 封禁到期后恢复为正常：登录、鉴权、后台列表都按同一套规则判定与惰性恢复。
 */
import type { Prisma, UserStatusType } from '@/generated/prisma/client';
import type { PrismaService } from '@/infra/prisma/prisma.service';

interface PlatformUserStatusFields {
  status: UserStatusType;
  status_reason: string | null;
  status_expires_at: Date | null;
}

/** 恢复正常时原因与期限一并清掉，避免下次限制时残留旧数据 */
export const ACTIVE_STATUS_DATA = {
  status: 'active',
  status_reason: null,
  status_expires_at: null,
} satisfies Prisma.UsersUpdateManyMutationInput;

/**
 * @func isStatusExpired
 * @desc 判断限制 / 封禁的截止时间是否已过。
 * @param {Date | null | undefined} expiresAt 截止时间，为空表示需要手动恢复。
 * @param {number} [now] 判定时刻，默认当前时间。
 * @returns {boolean} 已到期时为 true。
 */
export function isStatusExpired(expiresAt: Date | null | undefined, now = Date.now()): boolean {
  return Boolean(expiresAt && expiresAt.getTime() <= now);
}

/**
 * @func recoverExpiredPlatformUsers
 * @desc 把已到期的受限 / 封禁用户恢复为正常。
 *       没有定时任务，而是在读取状态的链路上（登录、鉴权、后台列表）顺手恢复：
 *       状态只在这些地方被用到，惰性恢复就能保证行为正确。
 * @param {PrismaService} prisma Prisma 客户端。
 * @param {Prisma.UsersWhereInput} [where] 额外的过滤条件，如只恢复某个用户。
 * @returns {Promise<Prisma.BatchPayload>} 被恢复的行数。
 */
export function recoverExpiredPlatformUsers(
  prisma: PrismaService,
  where: Prisma.UsersWhereInput = {},
) {
  return prisma.users.updateMany({
    where: { ...where, status: { not: 'active' }, status_expires_at: { lte: new Date() } },
    data: { ...ACTIVE_STATUS_DATA, updated_at: new Date() },
  });
}

/**
 * @func getEffectiveStatusFields
 * @desc 按截止时间换算出当前实际生效的状态，给还没来得及落库恢复的读取场景用。
 * @param {PlatformUserStatusFields} user 平台用户的状态字段。
 * @returns {{ status: UserStatusType, statusReason: string | null, statusExpiresAt: string | null }}
 *          实际生效的状态、原因与 ISO 格式的截止时间。
 */
export function getEffectiveStatusFields(user: PlatformUserStatusFields) {
  if (user.status !== 'active' && isStatusExpired(user.status_expires_at)) {
    return { status: 'active' as UserStatusType, statusReason: null, statusExpiresAt: null };
  }
  return {
    status: user.status,
    statusReason: user.status_reason,
    statusExpiresAt: user.status_expires_at?.toISOString() ?? null,
  };
}
