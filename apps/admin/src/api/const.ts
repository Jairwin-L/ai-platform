/**
 * 接口地址常量，对应 apps/db-service 的管理端控制器（根路径，不带 platform/ 前缀）。
 * BASE_API_URL 负责拼接服务端基址，这里只写控制器路径。
 */
export const AUTH = {
  LOGIN: '/auth/login',
  LOGIN_PUBLIC_KEY: '/auth/login-public-key',
  LOGOUT: '/auth/logout',
  ME: '/auth/me',
  MENUS: '/auth/menus',
};

export const RBAC = {
  PERMISSIONS: '/auth/permissions',
  ROLES: '/auth/roles',
  ROLE_PAGE: '/auth/roles/page-query-list',
  ROLE_QUERY_LIST: '/auth/roles/query-list',
  ROLE_USER_LIST: '/auth/roles/query-role-user-list',
  ROLE_SET_USER: '/auth/roles/set-role-user',
  USERS: '/auth/users',
  USER_ROLES: '/auth/user-roles',
  PLATFORM_USERS: '/auth/platform-users',
};

export const SETTINGS = {
  SYSTEM: '/system-settings',
  AI_PROVIDERS: '/ai-providers',
  THIRD_PARTY_SERVICES: '/third-party-services',
};
