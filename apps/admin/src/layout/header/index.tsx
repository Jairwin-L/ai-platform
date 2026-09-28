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
  const matched = [...matches]
    .reverse()
    .find((match) => (match.handle as RouteHandle | undefined)?.title);
  return matched?.handle as RouteHandle | undefined;
}

export default function Header() {
  const navigate = useNavigate();
  const matches = useMatches();
  const currentUser = useAuthStore((state) => state.currentUser);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const routeHandle = getCurrentRouteHandle(matches);
  const pageTitle = routeHandle?.title || SITE_NAME;
  const breadcrumbItems = (routeHandle?.breadcrumb ?? ['首页']).map((title) => ({ title }));
  const displayName = currentUser?.user.nickName || currentUser?.user.email || '管理员';

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
      <Breadcrumb items={breadcrumbItems} />
      <Dropdown
        menu={{ items: dropdownItems, onClick: onDropdownClick }}
        placement="bottomRight"
        trigger={['click']}
      >
        <button type="button" className={css['header-avatar']}>
          <Avatar
            size="small"
            icon={<UserOutlined />}
            src={currentUser?.user.picture || undefined}
          />
          <span className={css.username}>{displayName}</span>
          <DownOutlined />
        </button>
      </Dropdown>
    </header>
  );
}
