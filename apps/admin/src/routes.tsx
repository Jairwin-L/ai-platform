import { Navigate, createBrowserRouter, type RouteObject } from 'react-router';
import type { ResourceNode } from '@/api/methods/auth';
import ErrorBoundary from '@/components/error-boundary';
import PageLoading from '@/components/page-loading';
import { DASHBOARD_PATH, LOGIN_PATH } from '@/constants/app';
import Layout from '@/layout';
import type { MenuItem } from '@/layout/menus';
import {
  ROUTER_MENU,
  collectResourceRouteMetas,
  collectRoutes,
  type RouterMenu,
} from '@/router/route-registry';

interface AdminRouterOptions {
  /** 权限树映射不到任何本地页面时，是否回落到全量路由（仅超级管理员） */
  allowFallback?: boolean;
  menuItems?: MenuItem[];
}

/**
 * 由权限树推导可访问的路由。
 *
 * 超级管理员在权限表还没有对应记录时回落到全量路由：否则登录后除了工作台哪都去不了，
 * 连去菜单管理补数据的入口都没有。普通系统用户只注册被授权的页面，真正的越权拦截在服务端接口上。
 */
function getPrivateRoutes(resources: ResourceNode[], allowFallback: boolean): RouteObject[] {
  const resourceMetas = collectResourceRouteMetas(resources);
  const metas = resourceMetas.length > 0 || !allowFallback ? resourceMetas : ROUTER_MENU;
  const dashboard = ROUTER_MENU.find((meta) => meta.path === DASHBOARD_PATH);
  const unique = new Map<string, RouterMenu>();
  [...(dashboard ? [dashboard] : []), ...metas].forEach((meta) => unique.set(meta.path, meta));
  return collectRoutes(Array.from(unique.values()));
}

export function createAdminRouter(resources: ResourceNode[], options: AdminRouterOptions = {}) {
  const { allowFallback = false, menuItems = [] } = options;

  return createBrowserRouter([
    {
      path: LOGIN_PATH,
      lazy: async () => ({ Component: (await import('@/pages/auth/login')).default }),
      hydrateFallbackElement: <PageLoading />,
      errorElement: <ErrorBoundary />,
    },
    {
      path: '/',
      element: <Layout menuItems={menuItems} />,
      hydrateFallbackElement: <PageLoading />,
      errorElement: <ErrorBoundary />,
      children: [
        { index: true, element: <Navigate to={DASHBOARD_PATH} replace /> },
        ...getPrivateRoutes(resources, allowFallback),
        {
          path: '*',
          lazy: async () => ({ Component: (await import('@/pages/auth/not-found')).default }),
          handle: { title: '页面不存在', breadcrumb: ['首页', '页面不存在'] },
        },
      ],
    },
  ]);
}
