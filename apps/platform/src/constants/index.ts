/**
 * @file
 * 这个文件作为常量的目录
 * 目的是统一管理对外输出的常量，方便分类
 */

export { APP_BLACK_LOGO, APP_NAME } from './app';
export { AUTH_SESSION_COOKIE_NAME, VERIFICATION_CODE_TTL_SECONDS } from './auth';
export { ALLOW_FILE_TYPE } from './file';
export {
  getMissingPermissionMessage,
  getPermissionDisplayName,
  PERMISSION_DISPLAY_NAMES,
  SITE_PERMISSION_CODES,
} from './permissions';
export { R2_BUCKET_URL } from './r2';
export { ADMIN_ROLE_CODES, RoleCode, SYSTEM_ROLE_CODES } from './roles';
export * from './error-codes';
