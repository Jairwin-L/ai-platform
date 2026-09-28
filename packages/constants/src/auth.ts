/** platform 前台用户会话 Cookie，由 db-service 下发，经 platform 同源转发后落在站点域名下 */
export const AUTH_SESSION_COOKIE_NAME = 'auth_session';
/** 管理后台会话 Cookie，与前台会话隔离，同一浏览器可以同时登录两端 */
export const ADMIN_SESSION_COOKIE_NAME = 'admin_session';
export const VERIFICATION_CODE_TTL_SECONDS = 60;
