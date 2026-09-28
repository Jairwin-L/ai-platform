import type { ComponentType, ReactNode } from 'react';
import type { RouteObject } from 'react-router';
import {
  ApiOutlined,
  DashboardOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TeamOutlined,
  ToolOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { DASHBOARD_PATH } from '@/constants/app';

export interface RouteHandle {
  title: string;
  breadcrumb: string[];
}

export interface MenuRoute {
  path: string;
  title: string;
  icon: ReactNode;
  /** 目录节点：只出现在菜单里，没有对应页面 */
  children?: MenuRoute[];
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
 * 管理后台的菜单与路由注册表。
 *
 * 能进管理后台的只有 SUPER_ADMIN / ADMIN（由 db-service 的 admin 会话判定），
 * 管理员之间不再细分菜单权限，因此菜单是静态的，越权拦截以服务端 AdminAuth 为准。
 */
export const MENU_ROUTES: MenuRoute[] = [
  {
    path: DASHBOARD_PATH,
    title: '工作台',
    icon: <DashboardOutlined />,
    route: page(DASHBOARD_PATH, ['工作台'], () => import('@/pages/main')),
  },
  {
    path: '/system',
    title: '权限管理',
    icon: <TeamOutlined />,
    children: [
      {
        path: '/system/user',
        title: '用户管理',
        icon: <UserOutlined />,
        route: page('/system/user', ['权限管理', '用户管理'], () => import('@/pages/system/user')),
        relatedRoutes: [
          page(
            '/system/user/detail/:id',
            ['权限管理', '用户管理', '详情'],
            () => import('@/pages/system/user/detail'),
          ),
          page(
            '/system/user/edit/:id',
            ['权限管理', '用户管理', '编辑'],
            () => import('@/pages/system/user/edit'),
          ),
        ],
      },
      {
        path: '/system/role',
        title: '角色管理',
        icon: <TeamOutlined />,
        route: page('/system/role', ['权限管理', '角色管理'], () => import('@/pages/system/role')),
        relatedRoutes: [
          page(
            '/system/role/create',
            ['权限管理', '角色管理', '新建'],
            () => import('@/pages/system/role/create'),
          ),
          page(
            '/system/role/edit/:id',
            ['权限管理', '角色管理', '编辑'],
            () => import('@/pages/system/role/edit'),
          ),
        ],
      },
      {
        path: '/system/permission',
        title: '权限管理',
        icon: <SafetyCertificateOutlined />,
        route: page(
          '/system/permission',
          ['权限管理', '权限列表'],
          () => import('@/pages/system/permission'),
        ),
        relatedRoutes: [
          page(
            '/system/permission/create',
            ['权限管理', '权限列表', '新建'],
            () => import('@/pages/system/permission/create'),
          ),
          page(
            '/system/permission/edit/:id',
            ['权限管理', '权限列表', '编辑'],
            () => import('@/pages/system/permission/edit'),
          ),
        ],
      },
    ],
  },
  {
    path: '/settings',
    title: '系统配置',
    icon: <SettingOutlined />,
    children: [
      {
        path: '/system/settings',
        title: '基础配置',
        icon: <ToolOutlined />,
        route: page(
          '/system/settings',
          ['系统配置', '基础配置'],
          () => import('@/pages/system/settings'),
        ),
      },
      {
        path: '/system/ai-provider',
        title: 'AI Provider',
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
        path: '/system/third-party-service',
        title: '第三方服务',
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
    ],
  },
];

/** 展开注册表里的全部页面路由（含附属路由） */
export function collectRoutes(menus: MenuRoute[] = MENU_ROUTES): RouteObject[] {
  return menus.flatMap((menu) => [
    ...(menu.route ? [menu.route] : []),
    ...(menu.relatedRoutes ?? []),
    ...(menu.children ? collectRoutes(menu.children) : []),
  ]);
}
