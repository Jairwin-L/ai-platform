import type { ReactNode } from 'react';
import type { RouteObject } from 'react-router';
import {
  ApiOutlined,
  AppstoreOutlined,
  DashboardOutlined,
  MenuOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TeamOutlined,
  ToolOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { DASHBOARD_PATH } from '@/constants/app';
import type { ResourceNode } from '@/api/methods/auth';

export interface RouteHandle {
  breadcrumb?: string[];
  title?: string;
}

export interface RouterMenu {
  /**
   * 服务端权限记录用的其他标识（历史 code 或 path），任一命中都映射到这条路由。
   * 目录类资源的 path 未必是本地路由前缀，只能靠 code 命中，否则菜单 key 会退化成 `resource-<id>`。
   */
  aliases?: string[];
  /** 服务端权限资源的 code，见 apps/db-service/prisma/data/menu/data.ts 的 DEFAULT_PERMISSIONS */
  code: string;
  handle?: RouteHandle;
  icon: ReactNode;
  /** 纯目录节点，只出现在菜单里，没有对应页面 */
  menu?: boolean;
  /**
   * 本地静态菜单里所属目录的 path。
   * 缺省按 path 前缀归入目录；页面 URL 与目录不同前缀时（如系统配置下的 /system/*）需要显式声明。
   */
  parent?: string;
  path: string;
  /** 新增 / 编辑等不进菜单但要注册的附属路由 */
  relatedRoutes?: RouteObject[];
  route?: RouteObject;
  title: string;
}

export { DASHBOARD_PATH };

export const ROUTER_MENU: RouterMenu[] = [
  {
    code: 'ADMIN',
    title: '工作台',
    path: DASHBOARD_PATH,
    icon: <DashboardOutlined />,
    handle: { title: '工作台', breadcrumb: ['首页'] },
    route: {
      path: DASHBOARD_PATH,
      lazy: async () => ({ Component: (await import('@/pages/main')).default }),
      handle: { title: '工作台', breadcrumb: ['首页'] },
    },
  },
  {
    code: 'BUSINESS',
    title: '业务管理',
    path: '/business',
    icon: <AppstoreOutlined />,
    menu: true,
  },
  {
    code: 'BUSINESS_PLATFORM_USERS',
    title: '平台用户',
    path: '/business/platform-user',
    icon: <UserOutlined />,
    handle: { title: '平台用户', breadcrumb: ['首页', '业务管理', '平台用户'] },
    route: {
      path: '/business/platform-user',
      lazy: async () => ({
        Component: (await import('@/pages/business/platform-user')).default,
      }),
      handle: { title: '平台用户', breadcrumb: ['首页', '业务管理', '平台用户'] },
    },
  },
  {
    code: 'SYSTEM',
    title: '系统管理',
    path: '/system',
    icon: <TeamOutlined />,
    menu: true,
  },
  {
    code: 'SYSTEM_USERS',
    title: '用户管理',
    path: '/system/user',
    icon: <UserOutlined />,
    handle: { title: '用户管理', breadcrumb: ['首页', '系统管理', '用户管理'] },
    route: {
      path: '/system/user',
      lazy: async () => ({ Component: (await import('@/pages/system/user')).default }),
      handle: { title: '用户管理', breadcrumb: ['首页', '系统管理', '用户管理'] },
    },
    relatedRoutes: [
      {
        path: '/system/user/create',
        lazy: async () => ({ Component: (await import('@/pages/system/user/create')).default }),
        handle: { title: '新增用户', breadcrumb: ['首页', '系统管理', '用户管理', '新增'] },
      },
      {
        path: '/system/user/detail/:id',
        lazy: async () => ({ Component: (await import('@/pages/system/user/detail')).default }),
        handle: { title: '用户详情', breadcrumb: ['首页', '系统管理', '用户管理', '详情'] },
      },
      {
        path: '/system/user/edit/:id',
        lazy: async () => ({ Component: (await import('@/pages/system/user/edit')).default }),
        handle: { title: '编辑用户', breadcrumb: ['首页', '系统管理', '用户管理', '编辑'] },
      },
    ],
  },
  {
    code: 'SYSTEM_ROLES',
    title: '角色管理',
    path: '/system/role',
    icon: <SafetyCertificateOutlined />,
    handle: { title: '角色管理', breadcrumb: ['首页', '系统管理', '角色管理'] },
    route: {
      path: '/system/role',
      lazy: async () => ({ Component: (await import('@/pages/system/role')).default }),
      handle: { title: '角色管理', breadcrumb: ['首页', '系统管理', '角色管理'] },
    },
    relatedRoutes: [
      {
        path: '/system/role/create',
        lazy: async () => ({ Component: (await import('@/pages/system/role/create')).default }),
        handle: { title: '新建角色', breadcrumb: ['首页', '系统管理', '角色管理', '新建'] },
      },
      {
        path: '/system/role/edit/:id',
        lazy: async () => ({ Component: (await import('@/pages/system/role/edit')).default }),
        handle: { title: '编辑角色', breadcrumb: ['首页', '系统管理', '角色管理', '编辑'] },
      },
    ],
  },
  {
    code: 'SYSTEM_PERMISSIONS',
    title: '菜单管理',
    path: '/system/menu',
    icon: <MenuOutlined />,
    handle: { title: '菜单管理', breadcrumb: ['首页', '系统管理', '菜单管理'] },
    route: {
      path: '/system/menu',
      lazy: async () => ({ Component: (await import('@/pages/system/menu')).default }),
      handle: { title: '菜单管理', breadcrumb: ['首页', '系统管理', '菜单管理'] },
    },
    relatedRoutes: [
      {
        path: '/system/menu/create',
        lazy: async () => ({ Component: (await import('@/pages/system/menu/create')).default }),
        handle: { title: '新建资源', breadcrumb: ['首页', '系统管理', '菜单管理', '新建'] },
      },
      {
        path: '/system/menu/edit/:id',
        lazy: async () => ({ Component: (await import('@/pages/system/menu/edit')).default }),
        handle: { title: '编辑资源', breadcrumb: ['首页', '系统管理', '菜单管理', '编辑'] },
      },
    ],
  },
  {
    code: 'CONFIG',
    title: '系统配置',
    path: '/config',
    icon: <SettingOutlined />,
    menu: true,
  },
  {
    code: 'SYSTEM_SETTINGS',
    title: '基础配置',
    path: '/system/settings',
    parent: '/config',
    icon: <ToolOutlined />,
    handle: { title: '基础配置', breadcrumb: ['首页', '系统配置', '基础配置'] },
    route: {
      path: '/system/settings',
      lazy: async () => ({ Component: (await import('@/pages/system/settings')).default }),
      handle: { title: '基础配置', breadcrumb: ['首页', '系统配置', '基础配置'] },
    },
  },
  {
    code: 'SYSTEM_AI_PROVIDERS',
    title: 'AI Provider',
    path: '/system/ai-provider',
    parent: '/config',
    icon: <RobotOutlined />,
    handle: { title: 'AI Provider', breadcrumb: ['首页', '系统配置', 'AI Provider'] },
    route: {
      path: '/system/ai-provider',
      lazy: async () => ({ Component: (await import('@/pages/system/ai-provider')).default }),
      handle: { title: 'AI Provider', breadcrumb: ['首页', '系统配置', 'AI Provider'] },
    },
    relatedRoutes: [
      {
        path: '/system/ai-provider/create',
        lazy: async () => ({
          Component: (await import('@/pages/system/ai-provider/create')).default,
        }),
        handle: {
          title: '新建 AI Provider',
          breadcrumb: ['首页', '系统配置', 'AI Provider', '新建'],
        },
      },
      {
        path: '/system/ai-provider/edit/:value',
        lazy: async () => ({
          Component: (await import('@/pages/system/ai-provider/edit')).default,
        }),
        handle: {
          title: '编辑 AI Provider',
          breadcrumb: ['首页', '系统配置', 'AI Provider', '编辑'],
        },
      },
    ],
  },
  {
    code: 'SYSTEM_THIRD_PARTY_SERVICES',
    title: '第三方服务',
    path: '/system/third-party-service',
    parent: '/config',
    icon: <ApiOutlined />,
    handle: { title: '第三方服务', breadcrumb: ['首页', '系统配置', '第三方服务'] },
    route: {
      path: '/system/third-party-service',
      lazy: async () => ({
        Component: (await import('@/pages/system/third-party-service')).default,
      }),
      handle: { title: '第三方服务', breadcrumb: ['首页', '系统配置', '第三方服务'] },
    },
    relatedRoutes: [
      {
        path: '/system/third-party-service/create',
        lazy: async () => ({
          Component: (await import('@/pages/system/third-party-service/create')).default,
        }),
        handle: { title: '新建第三方服务', breadcrumb: ['首页', '系统配置', '第三方服务', '新建'] },
      },
      {
        path: '/system/third-party-service/edit/:value',
        lazy: async () => ({
          Component: (await import('@/pages/system/third-party-service/edit')).default,
        }),
        handle: { title: '编辑第三方服务', breadcrumb: ['首页', '系统配置', '第三方服务', '编辑'] },
      },
    ],
  },
];

const META_BY_CODE = new Map<string, RouterMenu>();
const META_BY_PATH = new Map<string, RouterMenu>();

ROUTER_MENU.forEach((meta) => {
  META_BY_CODE.set(meta.code, meta);
  META_BY_PATH.set(meta.path, meta);
  meta.aliases?.forEach((alias) => {
    META_BY_CODE.set(alias, meta);
    META_BY_PATH.set(alias, meta);
  });
});

function normalizePath(path?: string | null): string {
  return path || '';
}

/** 把服务端的权限资源映射到本地路由：code / path（含 aliases）任一命中即可 */
export function getRouteMeta(resource: ResourceNode): RouterMenu | undefined {
  return META_BY_CODE.get(resource.code) || META_BY_PATH.get(normalizePath(resource.path));
}

export function getResourceRoutePath(resource: ResourceNode): string {
  return getRouteMeta(resource)?.path || normalizePath(resource.path);
}

export function isKnownRoutePath(path?: string | null): boolean {
  const value = normalizePath(path);
  return Boolean(value && META_BY_PATH.get(value)?.route);
}

/**
 * 权限记录里 icon 字段存的是图标组件名，
 * 映射不到本地路由的资源（如新增的目录）靠它拿到图标，否则整列都是同一个兜底图标。
 */
const MENU_ICON_BY_NAME: Record<string, ReactNode> = {
  ApiOutlined: <ApiOutlined />,
  AppstoreOutlined: <AppstoreOutlined />,
  DashboardOutlined: <DashboardOutlined />,
  MenuOutlined: <MenuOutlined />,
  RobotOutlined: <RobotOutlined />,
  SafetyCertificateOutlined: <SafetyCertificateOutlined />,
  SettingOutlined: <SettingOutlined />,
  TeamOutlined: <TeamOutlined />,
  ToolOutlined: <ToolOutlined />,
  UserOutlined: <UserOutlined />,
};

export function getRouteIcon(resource: ResourceNode): ReactNode {
  const meta = getRouteMeta(resource);
  if (meta?.icon) return meta.icon;

  const iconName = resource.icon?.trim();
  return (iconName && MENU_ICON_BY_NAME[iconName]) || <MenuOutlined />;
}

/** 收集权限树里能映射到本地页面的路由记录，按树的遍历顺序去重 */
export function collectResourceRouteMetas(resources: ResourceNode[]): RouterMenu[] {
  const metas: RouterMenu[] = [];
  const seen = new Set<string>();

  function visit(resource: ResourceNode) {
    const meta = getRouteMeta(resource);
    if (meta?.route && !seen.has(meta.path)) {
      metas.push(meta);
      seen.add(meta.path);
    }
    resource.children?.forEach(visit);
  }

  resources.forEach(visit);
  return metas;
}
