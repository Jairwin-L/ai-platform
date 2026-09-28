/**
 * 接口地址常量，对应 apps/db-service 的管理后台控制器（根路径，不带 platform/ 前缀）。
 * BASE_API_URL 负责拼接服务端基址，这里只写控制器路径。
 */
export const AUTH = {
  LOGIN: '/auth/login',
  LOGIN_PUBLIC_KEY: '/auth/login-public-key',
  LOGOUT: '/auth/logout',
  ME: '/auth/me',
};

export const RBAC = {
  USERS: '/users',
  ROLES: '/roles',
  PERMISSIONS: '/permissions',
};

export const SETTINGS = {
  SYSTEM: '/system-settings',
  AI_PROVIDERS: '/ai-providers',
  THIRD_PARTY_SERVICES: '/third-party-services',
};
