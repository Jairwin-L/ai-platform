import { Navigate, createBrowserRouter } from 'react-router';
import ErrorBoundary from '@/components/error-boundary';
import PageLoading from '@/components/page-loading';
import { DASHBOARD_PATH, LOGIN_PATH } from '@/constants/app';
import Layout from '@/layout';
import { collectRoutes } from '@/router/route-registry';

export function createAdminRouter() {
  return createBrowserRouter([
    {
      path: LOGIN_PATH,
      lazy: async () => ({ Component: (await import('@/pages/auth/login')).default }),
      hydrateFallbackElement: <PageLoading />,
      errorElement: <ErrorBoundary />,
    },
    {
      path: '/',
      element: <Layout />,
      hydrateFallbackElement: <PageLoading />,
      errorElement: <ErrorBoundary />,
      children: [
        { index: true, element: <Navigate to={DASHBOARD_PATH} replace /> },
        ...collectRoutes(),
        {
          path: '*',
          lazy: async () => ({ Component: (await import('@/pages/auth/not-found')).default }),
          handle: { title: '页面不存在', breadcrumb: ['首页', '页面不存在'] },
        },
      ],
    },
  ]);
}
