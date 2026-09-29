import { Navigate, createBrowserRouter, type RouteObject } from 'react-router';
import ErrorBoundary from '@/components/error-boundary';
import PageLoading from '@/components/page-loading';
import { LOGIN_PATH } from '@/constants/app';
import Layout from '@/layout';
import type { MenuItem } from '@/layout/menus';
import type { ResourceNode } from '@/api/methods/auth';
import {
  ROUTER_MENU,
  DASHBOARD_PATH,
  collectResourceRouteMetas,
  type RouterMenu,
} from '@/router/route-registry';

interface AdminRouterOptions {
  /** 权限树映射不到任何本地页面时，是否回落到全量路由（仅超级管理员） */
  allowFallback?: boolean;
  menuItems?: MenuItem[];
  menuLoading?: boolean;
}

function pushMetaRoutes(meta: RouterMenu, routes: RouteObject[], seen: Set<string>) {
  if (meta.route?.path && !seen.has(meta.route.path)) {
    routes.push(meta.route);
    seen.add(meta.route.path);
  }
  meta.relatedRoutes?.forEach((route) => {
    if (route.path && !seen.has(route.path)) {
      routes.push(route);
      seen.add(route.path);
    }
  });
}

/**
 * 由权限树推导可访问的路由。
 *
 * 超级管理员在权限表还没有对应记录时回落到全量路由：否则登录后除了工作台哪都去不了，
 * 连去菜单管理补数据的入口都没有。普通系统用户只注册被授权的页面，真正的越权拦截在服务端接口上。
 */
function getPrivateRoutes(resources: ResourceNode[], allowFallback: boolean): RouteObject[] {
  const routes: RouteObject[] = [];
  const seen = new Set<string>();
  const resourceMetas = collectResourceRouteMetas(resources);
  const metas = resourceMetas.length > 0 || !allowFallback ? resourceMetas : ROUTER_MENU;

  const dashboard = ROUTER_MENU.find((meta) => meta.path === DASHBOARD_PATH);
  if (dashboard) pushMetaRoutes(dashboard, routes, seen);
  metas.forEach((meta) => pushMetaRoutes(meta, routes, seen));

  return routes;
}

export function createAdminRouter(resources: ResourceNode[], options: AdminRouterOptions = {}) {
  const { allowFallback = false, menuItems = [], menuLoading = false } = options;

  return createBrowserRouter([
    {
      path: LOGIN_PATH,
      lazy: async () => ({ Component: (await import('@/pages/auth/login')).default }),
      hydrateFallbackElement: <PageLoading />,
      errorElement: <ErrorBoundary />,
    },
    {
      path: '/',
      element: <Layout menuItems={menuItems} menuLoading={menuLoading} />,
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
