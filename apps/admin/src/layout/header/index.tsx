import { useEffect } from 'react';
import { useMatches, useNavigate } from 'react-router';
import { Avatar, Breadcrumb, Dropdown, type MenuProps } from 'antd';
import { AppstoreOutlined, DownOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { LOGIN_PATH, SITE_NAME, VITE_ENV } from '@/constants';
import type { RouteHandle } from '@/router/route-registry';
import { useAuthStore } from '@/stores/auth';
import css from './index.module.scss';

const PLATFORM_URL = VITE_ENV.VITE_PLATFORM_URL?.trim();

const dropdownItems: MenuProps['items'] = [
  ...(PLATFORM_URL
    ? [
        { key: 'platform', icon: <AppstoreOutlined />, label: '前台站点' },
        { type: 'divider' as const },
      ]
    : []),
  { key: 'sign-out', icon: <LogoutOutlined />, label: '退出登录', danger: true },
];

function getCurrentRouteHandle(matches: ReturnType<typeof useMatches>) {
  const matchedRoute = [...matches]
    .reverse()
    .find((match) => (match.handle as RouteHandle | undefined)?.title);
  return matchedRoute?.handle as RouteHandle | undefined;
}

function buildBreadcrumbItems(handle: RouteHandle | undefined, pageTitle: string) {
  const titles = handle?.breadcrumb?.length ? handle.breadcrumb : ['首页', pageTitle];
  return titles.map((title) => ({ title }));
}

export default function Header() {
  const navigate = useNavigate();
  const matches = useMatches();
  const currentUser = useAuthStore((state) => state.currentUser);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const routeHandle = getCurrentRouteHandle(matches);
  const pageTitle = routeHandle?.title || SITE_NAME;
  const breadcrumbItems = buildBreadcrumbItems(routeHandle, pageTitle);
  const displayName =
    currentUser?.nickname || currentUser?.username || currentUser?.account || '管理员';

  useEffect(() => {
    const appTitle = VITE_ENV.VITE_APP_TITLE || SITE_NAME;
    document.title = pageTitle === SITE_NAME ? appTitle : `${pageTitle} - ${appTitle}`;
  }, [pageTitle]);

  const onDropdownClick: MenuProps['onClick'] = async ({ key }) => {
    if (key === 'platform' && PLATFORM_URL) {
      window.open(PLATFORM_URL, '_blank', 'noopener,noreferrer');
      return;
    }
    if (key === 'sign-out') {
      await clearAuth();
      void navigate(LOGIN_PATH, { replace: true });
    }
  };

  return (
    <header className={css['header-container']}>
      <div className={css['page-heading']}>
        <Breadcrumb items={breadcrumbItems} />
      </div>
      <Dropdown
        menu={{ items: dropdownItems, onClick: onDropdownClick }}
        placement="bottomRight"
        trigger={['click']}
      >
        <button type="button" className={css['header-avatar']}>
          <Avatar icon={<UserOutlined />} size={24} src={currentUser?.avatar || undefined} />
          <span className={css.username}>{displayName}</span>
          <DownOutlined className={css['dropdown-icon']} />
        </button>
      </Dropdown>
    </header>
  );
}
