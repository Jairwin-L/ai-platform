/**
 * @file 用户角色关联的有效性口径。
 *       user_roles 是带生效区间、可撤销的授权记录，鉴权、个人资料、后台列表都要按同一套条件过滤，
 *       分散在各处手写迟早会有一处漏掉 valid_until，导致过期授权仍然生效。
 */
import type { Prisma } from '@/generated/prisma/client';
import { ADMIN_ROLE_CODES } from '@ai/constants/roles';

/**
 * @func getActiveUserRoleWhere
 * @desc 生成「当前仍然有效的角色授权」查询条件：未撤销、在生效区间内、角色已启用。
 * @param {Date} [now] 判定时刻，默认当前时间。
 * @returns {Prisma.UserRolesWhereInput} 可直接用于 user_roles 的 where 条件。
 */
export function getActiveUserRoleWhere(now: Date = new Date()): Prisma.UserRolesWhereInput {
  return {
    revoked_at: null,
    AND: [
      { OR: [{ valid_from: null }, { valid_from: { lte: now } }] },
      { OR: [{ valid_until: null }, { valid_until: { gt: now } }] },
    ],
    role: { status: 'ENABLED' },
  };
}

/**
 * @func isAdminRole
 * @desc 判断角色编码集合中是否包含管理员角色（SUPER_ADMIN / ADMIN）。
 * @param {string[]} roles 角色编码列表。
 * @returns {boolean} 持有任一管理员角色时为 true。
 */
export function isAdminRole(roles: string[]): boolean {
  return roles.some((role) => ADMIN_ROLE_CODES.includes(role as (typeof ADMIN_ROLE_CODES)[number]));
}
