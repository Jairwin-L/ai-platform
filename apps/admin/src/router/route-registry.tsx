import type { ComponentType, ReactNode } from 'react';
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
import type { ResourceNode } from '@/api/methods/auth';
import { DASHBOARD_PATH } from '@/constants/app';

export interface RouteHandle {
  title: string;
  breadcrumb: string[];
}

export interface RouterMenu {
  /** 服务端权限资源的 code，见 apps/db-service/prisma/data/menu/data.ts 的 DEFAULT_PERMISSIONS */
  code: string;
  title: string;
  path: string;
  icon: ReactNode;
  /** 纯目录节点，只出现在菜单里，没有对应页面 */
  menu?: boolean;
  route?: RouteObject;
  /** 新增 / 编辑 / 详情等不进菜单但要注册的附属路由 */
  relatedRoutes?: RouteObject[];
}

function page(
  path: string,
  breadcrumb: string[],
  load: () => Promise<{ default: ComponentType }>,
): RouteObject {
  const handle: RouteHandle = {
    title: breadcrumb.at(-1) ?? '',
    breadcrumb: ['首页', ...breadcrumb],
  };
  return { path, handle, lazy: async () => ({ Component: (await load()).default }) };
}

/**
 * 管理端本地页面注册表。
 *
 * 能看到哪些菜单、注册哪些路由由服务端 `/auth/menus` 返回的权限资源树决定：资源 code 或 path
 * 命中这里的记录才会注册对应页面。真正的越权拦截在 db-service 的 AdminPermissionAuth 上。
 */
export const ROUTER_MENU: RouterMenu[] = [
  {
    code: 'ADMIN',
    title: '工作台',
    path: DASHBOARD_PATH,
    icon: <DashboardOutlined />,
    route: page(DASHBOARD_PATH, ['工作台'], () => import('@/pages/main')),
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
    route: page(
      '/business/platform-user',
      ['业务管理', '平台用户'],
      () => import('@/pages/business/platform-user'),
    ),
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
    route: page('/system/user', ['系统管理', '用户管理'], () => import('@/pages/system/user')),
    relatedRoutes: [
      page(
        '/system/user/create',
        ['系统管理', '用户管理', '新增'],
        () => import('@/pages/system/user/create'),
      ),
      page(
        '/system/user/detail/:id',
        ['系统管理', '用户管理', '详情'],
        () => import('@/pages/system/user/detail'),
      ),
      page(
        '/system/user/edit/:id',
        ['系统管理', '用户管理', '编辑'],
        () => import('@/pages/system/user/edit'),
      ),
    ],
  },
  {
    code: 'SYSTEM_ROLES',
    title: '角色管理',
    path: '/system/role',
    icon: <SafetyCertificateOutlined />,
    route: page('/system/role', ['系统管理', '角色管理'], () => import('@/pages/system/role')),
    relatedRoutes: [
      page(
        '/system/role/create',
        ['系统管理', '角色管理', '新建'],
        () => import('@/pages/system/role/create'),
      ),
      page(
        '/system/role/edit/:id',
        ['系统管理', '角色管理', '编辑'],
        () => import('@/pages/system/role/edit'),
      ),
    ],
  },
  {
    code: 'SYSTEM_PERMISSIONS',
    title: '菜单管理',
    path: '/system/menu',
    icon: <MenuOutlined />,
    route: page('/system/menu', ['系统管理', '菜单管理'], () => import('@/pages/system/menu')),
    relatedRoutes: [
      page(
        '/system/menu/create',
        ['系统管理', '菜单管理', '新建'],
        () => import('@/pages/system/menu/create'),
      ),
      page(
        '/system/menu/edit/:id',
        ['系统管理', '菜单管理', '编辑'],
        () => import('@/pages/system/menu/edit'),
      ),
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
    icon: <ToolOutlined />,
    route: page(
      '/system/settings',
      ['系统配置', '基础配置'],
      () => import('@/pages/system/settings'),
    ),
  },
  {
    code: 'SYSTEM_AI_PROVIDERS',
    title: 'AI Provider',
    path: '/system/ai-provider',
    icon: <RobotOutlined />,
    route: page(
      '/system/ai-provider',
      ['系统配置', 'AI Provider'],
      () => import('@/pages/system/ai-provider'),
    ),
    relatedRoutes: [
      page(
        '/system/ai-provider/create',
        ['系统配置', 'AI Provider', '新建'],
        () => import('@/pages/system/ai-provider/create'),
      ),
      page(
        '/system/ai-provider/edit/:value',
        ['系统配置', 'AI Provider', '编辑'],
        () => import('@/pages/system/ai-provider/edit'),
      ),
    ],
  },
  {
    code: 'SYSTEM_THIRD_PARTY_SERVICES',
    title: '第三方服务',
    path: '/system/third-party-service',
    icon: <ApiOutlined />,
    route: page(
      '/system/third-party-service',
      ['系统配置', '第三方服务'],
      () => import('@/pages/system/third-party-service'),
    ),
    relatedRoutes: [
      page(
        '/system/third-party-service/create',
        ['系统配置', '第三方服务', '新建'],
        () => import('@/pages/system/third-party-service/create'),
      ),
      page(
        '/system/third-party-service/edit/:value',
        ['系统配置', '第三方服务', '编辑'],
        () => import('@/pages/system/third-party-service/edit'),
      ),
    ],
  },
];

const META_BY_CODE = new Map(ROUTER_MENU.map((meta) => [meta.code, meta]));
const META_BY_PATH = new Map(ROUTER_MENU.map((meta) => [meta.path, meta]));

/** 权限记录里 icon 字段存的是图标组件名，映射不到本地路由的资源（如新增的目录）靠它拿图标 */
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

/** 把服务端的权限资源映射到本地路由：code 或 path 任一命中即可 */
export function getRouteMeta(resource: ResourceNode): RouterMenu | undefined {
  return META_BY_CODE.get(resource.code) || META_BY_PATH.get(resource.path ?? '');
}

export function getResourceRoutePath(resource: ResourceNode): string {
  return getRouteMeta(resource)?.path || resource.path || '';
}

export function isKnownRoutePath(path?: string | null): boolean {
  return Boolean(path && META_BY_PATH.get(path)?.route);
}

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

/** 展开路由记录里的全部页面路由（含附属路由） */
export function collectRoutes(metas: RouterMenu[]): RouteObject[] {
  return metas.flatMap((meta) => [
    ...(meta.route ? [meta.route] : []),
    ...(meta.relatedRoutes ?? []),
  ]);
}
