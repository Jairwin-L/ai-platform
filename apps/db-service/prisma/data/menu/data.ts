import type { Prisma } from '../../../generated/prisma/client';

interface DefaultPermission {
  code: string;
  name: string;
  description: string;
  type: Prisma.PermissionCreateInput['type'];
  parentCode: string | null;
  path?: string | null;
  icon?: string | null;
  isShow?: boolean;
  enable?: boolean;
  keepAlive?: boolean;
  sort?: number;
}

/**
 * 管理端菜单与按钮资源，以此为准覆盖式同步到 permissions 表。
 *
 * 父节点必须排在子节点之前；按钮权限码与 @ai/constants/permissions 的 PERMISSION_CODE 一一对应，
 * 菜单 path 与 apps/admin/src/router/route-registry.tsx 的本地路由一一对应。
 */
export const DEFAULT_PERMISSIONS: DefaultPermission[] = [
  {
    code: 'ADMIN',
    name: '工作台',
    description: '管理端工作台',
    type: 'menu',
    path: '/main',
    icon: 'DashboardOutlined',
    sort: 10,
    parentCode: null,
  },
  {
    code: 'BUSINESS',
    name: '业务管理',
    description: '平台用户管理模块',
    type: 'directory',
    path: '/business',
    icon: 'AppstoreOutlined',
    sort: 20,
    parentCode: null,
  },
  {
    code: 'BUSINESS_PLATFORM_USERS',
    name: '平台用户',
    description: '平台注册用户管理页面',
    type: 'menu',
    path: '/business/platform-user',
    icon: 'UserOutlined',
    sort: 10,
    parentCode: 'BUSINESS',
  },
  {
    code: 'PLATFORM_USER_READ',
    name: '查看平台用户',
    description: '查看平台注册用户列表',
    type: 'button',
    parentCode: 'BUSINESS_PLATFORM_USERS',
  },
  {
    code: 'PLATFORM_USER_WRITE_PERMISSION',
    name: '修改平台用户状态',
    description: '将平台注册用户设为正常、受限、封禁或停用',
    type: 'button',
    parentCode: 'BUSINESS_PLATFORM_USERS',
  },
  {
    code: 'SYSTEM',
    name: '系统管理',
    description: '系统用户、角色与菜单权限管理模块',
    type: 'directory',
    path: '/system',
    icon: 'TeamOutlined',
    sort: 30,
    parentCode: null,
  },
  {
    code: 'SYSTEM_USERS',
    name: '用户管理',
    description: '系统用户管理页面',
    type: 'menu',
    path: '/system/user',
    icon: 'UserOutlined',
    sort: 1,
    parentCode: 'SYSTEM',
  },
  {
    code: 'USER_READ',
    name: '查看用户',
    description: '查看系统用户列表',
    type: 'button',
    parentCode: 'SYSTEM_USERS',
  },
  {
    code: 'USER_CREATE',
    name: '新增用户',
    description: '创建系统用户',
    type: 'button',
    parentCode: 'SYSTEM_USERS',
  },
  {
    code: 'USER_ASSIGN_ROLE',
    name: '分配用户角色',
    description: '调整系统用户持有的角色',
    type: 'button',
    parentCode: 'SYSTEM_USERS',
  },
  {
    code: 'USER_EDIT',
    name: '编辑用户',
    description: '编辑系统用户信息',
    type: 'button',
    parentCode: 'SYSTEM_USERS',
  },
  {
    code: 'USER_DELETE',
    name: '删除用户',
    description: '删除系统用户',
    type: 'button',
    parentCode: 'SYSTEM_USERS',
  },
  {
    code: 'USER_SET_STATE',
    name: '启用停用用户',
    description: '启用或停用系统用户',
    type: 'button',
    parentCode: 'SYSTEM_USERS',
  },
  {
    code: 'USER_RESET_PASSWORD',
    name: '重置用户密码',
    description: '管理员重置系统用户密码',
    type: 'button',
    parentCode: 'SYSTEM_USERS',
  },
  {
    code: 'SYSTEM_ROLES',
    name: '角色管理',
    description: '角色管理页面',
    type: 'menu',
    path: '/system/role',
    icon: 'SafetyCertificateOutlined',
    sort: 2,
    parentCode: 'SYSTEM',
  },
  {
    code: 'ROLE_READ',
    name: '查看角色',
    description: '查看角色列表',
    type: 'button',
    parentCode: 'SYSTEM_ROLES',
  },
  {
    code: 'ROLE_CREATE',
    name: '创建角色',
    description: '创建新角色',
    type: 'button',
    parentCode: 'SYSTEM_ROLES',
  },
  {
    code: 'ROLE_EDIT',
    name: '编辑角色',
    description: '编辑角色信息与授权',
    type: 'button',
    parentCode: 'SYSTEM_ROLES',
  },
  {
    code: 'ROLE_DELETE',
    name: '删除角色',
    description: '删除角色',
    type: 'button',
    parentCode: 'SYSTEM_ROLES',
  },
  {
    code: 'ROLE_SET_STATE',
    name: '启用停用角色',
    description: '启用或停用角色',
    type: 'button',
    parentCode: 'SYSTEM_ROLES',
  },
  {
    code: 'ROLE_ASSIGN_USER',
    name: '分配角色用户',
    description: '批量设置角色下的系统用户',
    type: 'button',
    parentCode: 'SYSTEM_ROLES',
  },
  {
    code: 'SYSTEM_PERMISSIONS',
    name: '菜单管理',
    description: '菜单资源权限管理页面',
    type: 'menu',
    path: '/system/menu',
    icon: 'MenuOutlined',
    sort: 3,
    parentCode: 'SYSTEM',
  },
  {
    code: 'PERMISSION_READ',
    name: '查看资源',
    description: '查看菜单资源列表',
    type: 'button',
    parentCode: 'SYSTEM_PERMISSIONS',
  },
  {
    // 编码沿用历史命名，实际覆盖菜单资源的新增、编辑、启停与删除
    code: 'PERMISSION_ASSIGN',
    name: '管理资源',
    description: '新增、编辑、启停与删除菜单资源',
    type: 'button',
    parentCode: 'SYSTEM_PERMISSIONS',
  },
  {
    code: 'CONFIG',
    name: '系统配置',
    description: '基础配置、AI Provider 与第三方服务配置模块',
    type: 'directory',
    path: '/config',
    icon: 'SettingOutlined',
    sort: 40,
    parentCode: null,
  },
  {
    code: 'SYSTEM_SETTINGS',
    name: '基础配置',
    description: '系统基础配置页面',
    type: 'menu',
    path: '/system/settings',
    icon: 'ToolOutlined',
    sort: 1,
    parentCode: 'CONFIG',
  },
  {
    code: 'SETTINGS_READ',
    name: '查看基础配置',
    description: '查看系统基础配置',
    type: 'button',
    parentCode: 'SYSTEM_SETTINGS',
  },
  {
    code: 'SETTINGS_WRITE',
    name: '管理基础配置',
    description: '修改系统基础配置',
    type: 'button',
    parentCode: 'SYSTEM_SETTINGS',
  },
  {
    code: 'SYSTEM_AI_PROVIDERS',
    name: 'AI Provider',
    description: 'AI Provider 选项管理页面',
    type: 'menu',
    path: '/system/ai-provider',
    icon: 'RobotOutlined',
    sort: 2,
    parentCode: 'CONFIG',
  },
  {
    code: 'AI_PROVIDER_READ',
    name: '查看 AI Provider',
    description: '查看 AI Provider 选项',
    type: 'button',
    parentCode: 'SYSTEM_AI_PROVIDERS',
  },
  {
    code: 'AI_PROVIDER_WRITE',
    name: '管理 AI Provider',
    description: '新增、编辑与删除 AI Provider 选项',
    type: 'button',
    parentCode: 'SYSTEM_AI_PROVIDERS',
  },
  {
    code: 'SYSTEM_THIRD_PARTY_SERVICES',
    name: '第三方服务',
    description: '第三方服务选项管理页面',
    type: 'menu',
    path: '/system/third-party-service',
    icon: 'ApiOutlined',
    sort: 3,
    parentCode: 'CONFIG',
  },
  {
    code: 'THIRD_PARTY_SERVICE_READ',
    name: '查看第三方服务',
    description: '查看第三方服务选项',
    type: 'button',
    parentCode: 'SYSTEM_THIRD_PARTY_SERVICES',
  },
  {
    code: 'THIRD_PARTY_SERVICE_WRITE',
    name: '管理第三方服务',
    description: '新增、编辑与删除第三方服务选项',
    type: 'button',
    parentCode: 'SYSTEM_THIRD_PARTY_SERVICES',
  },
];
