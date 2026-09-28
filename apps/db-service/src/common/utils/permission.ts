/**
 * @file 接口级权限判定工具。
 *       PermissionsGuard 与需要按请求内容细分权限的业务服务（如「改资料」和「启停」共用一个接口）
 *       共用同一套口径：超级管理员直接放行，其余账号按权限码逐个比对。
 */
import { AUTH_ERROR } from '@ai/constants/error-codes';
import { ApiException } from '@/common/http/api-exception';
import { isAdminRole } from '@/infra/permissions/user-auth.query';

type PermissionSubject = Pick<AuthUser, 'roles' | 'permissions'>;

/**
 * @func isSuperAdmin
 * @desc 判断登录用户是否持有超级管理员角色。
 * @param {PermissionSubject} user 登录用户。
 * @returns {boolean} 持有 ADMIN_ROLE_CODES 中任一角色时为 true。
 */
export function isSuperAdmin(user: PermissionSubject): boolean {
  return isAdminRole(user.roles);
}

/**
 * @func getMissingPermissions
 * @desc 找出登录用户缺少的权限码；超级管理员视为全部拥有。
 * @param {PermissionSubject} user 登录用户。
 * @param {string[]} codes 需要校验的权限码。
 * @returns {string[]} 缺少的权限码，全部拥有时为空数组。
 */
function getMissingPermissions(user: PermissionSubject, codes: string[]): string[] {
  if (codes.length === 0 || isSuperAdmin(user)) return [];
  return codes.filter((code) => !user.permissions.includes(code));
}

/**
 * @func hasAnyPermission
 * @desc 判断登录用户是否至少拥有其中一个权限码；未指定权限码或超级管理员时直接视为满足。
 * @param {PermissionSubject} user 登录用户。
 * @param {string[]} codes 候选权限码。
 * @returns {boolean} 满足时为 true。
 */
function hasAnyPermission(user: PermissionSubject, codes: string[]): boolean {
  if (codes.length === 0 || isSuperAdmin(user)) return true;
  return codes.some((code) => user.permissions.includes(code));
}

/**
 * @func assertPermissions
 * @desc 要求登录用户同时拥有全部指定权限码。
 * @param {PermissionSubject} user 登录用户。
 * @param {string[]} codes 需要同时拥有的权限码。
 * @throws {ApiException} 缺少任一权限码时抛出 403。
 */
export function assertPermissions(user: PermissionSubject, codes: string[]): void {
  const missing = getMissingPermissions(user, codes);
  if (missing.length > 0) {
    throw new ApiException(AUTH_ERROR.FORBIDDEN, `缺少权限：${missing.join('、')}`, null, 403);
  }
}

/**
 * @func assertAnyPermission
 * @desc 要求登录用户至少拥有其中一个权限码。
 * @param {PermissionSubject} user 登录用户。
 * @param {string[]} codes 候选权限码。
 * @throws {ApiException} 一个都没有时抛出 403。
 */
export function assertAnyPermission(user: PermissionSubject, codes: string[]): void {
  if (!hasAnyPermission(user, codes)) {
    throw new ApiException(
      AUTH_ERROR.FORBIDDEN,
      `缺少权限，至少需要其中之一：${codes.join('、')}`,
      null,
      403,
    );
  }
}

/**
 * @func assertGrantable
 * @desc 授权类操作的越权兜底：存在无权授出的权限码时拒绝本次操作。
 * @param {string[]} ungrantableCodes 由 PermissionsService 算出的越权权限码。
 * @throws {ApiException} 列表非空时抛出 403。
 */
export function assertGrantable(ungrantableCodes: string[]): void {
  if (ungrantableCodes.length > 0) {
    throw new ApiException(
      AUTH_ERROR.FORBIDDEN,
      `不能授予自己未拥有的权限：${ungrantableCodes.join('、')}`,
      null,
      403,
    );
  }
}
