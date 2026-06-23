'use client';

import {
  AppstoreOutlined,
  DashboardOutlined,
  LogoutOutlined,
  SettingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { ConfigProvider, Dropdown, Layout, Menu, type MenuProps } from 'antd';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { APP_NAME } from '@/constants';
import { usePermission } from '@/hooks/use-permission';
import styles from './admin-shell.module.scss';

const menuItems: MenuProps['items'] = [
  { key: '/admin', icon: <DashboardOutlined />, label: '概览' },
  {
    key: 'accounts',
    icon: <TeamOutlined />,
    label: '账号与访问',
    children: [
      { key: '/admin/users', label: '用户' },
      { key: '/admin/roles', label: '角色' },
      { key: '/admin/permissions', label: '权限' },
    ],
  },
  {
    key: 'settings',
    icon: <SettingOutlined />,
    label: '系统',
    children: [{ key: '/admin/system-settings', label: '系统设置' }],
  },
];

function getOpenKeys(pathname: string): string[] {
  if (pathname.startsWith('/admin/system-settings')) {
    return ['settings'];
  }

  return pathname === '/admin' ? [] : ['accounts'];
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = usePermission();
  const [collapsed, setCollapsed] = useState(false);
  const [openKeys, setOpenKeys] = useState<string[]>(() => getOpenKeys(pathname));
  // const selectedKey = getSelectedKey(pathname);
  // const selectedKey = pathname;
  const displayName = user?.nickName || user?.email || '管理员';

  useEffect(() => {
    if (!collapsed) {
      setOpenKeys(getOpenKeys(pathname));
    }
  }, [collapsed, pathname]);

  function onMenuOpenChange(nextOpenKeys: string[]): void {
    if (nextOpenKeys.length <= 1) {
      setOpenKeys(nextOpenKeys);
      return;
    }

    const latestOpenKey = nextOpenKeys.at(-1);

    if (latestOpenKey?.includes(nextOpenKeys[0])) {
      setOpenKeys(nextOpenKeys);
      return;
    }

    setOpenKeys(latestOpenKey ? [latestOpenKey] : []);
  }

  function onHeaderMenuClick({ key }: { key: string }): void {
    if (key === 'platform') {
      router.push('/');
    }
  }

  function getPopupContainer(node?: HTMLElement): HTMLElement {
    const popupContainer = document.querySelector<HTMLElement>('.popup-container') ?? node;

    if (
      node &&
      (node.className.includes('ant-select-selector') ||
        node.className.includes('ant-picker') ||
        node.className.includes('anticon-history'))
    ) {
      return popupContainer ?? document.body;
    }

    return document.body;
  }

  return (
    <div className={styles['layout-wrap']}>
      <Layout.Sider
        className={styles['sider-container']}
        collapsible
        collapsed={collapsed}
        theme="dark"
        onCollapse={setCollapsed}
      >
        <div className={styles['logo-box']}>
          <img alt="logo" className={styles['logo-img']} src="/globe.svg" />
          {!collapsed && <span className={styles['logo-text']}>Control Center</span>}
        </div>
        <Menu
          items={menuItems}
          mode="inline"
          openKeys={collapsed ? [] : openKeys}
          selectedKeys={[pathname]}
          theme="dark"
          triggerSubMenuAction="click"
          onClick={({ key }) => {
            if (key.startsWith('/')) {
              router.push(key);
            }
          }}
          onOpenChange={onMenuOpenChange}
        />
      </Layout.Sider>
      <div className={styles['layout-container']}>
        <header className={styles['header-container']}>
          <span />
          <div className={styles['header-ri']}>
            <Dropdown
              menu={{
                items: [
                  { key: 'platform', icon: <AppstoreOutlined />, label: '平台' },
                  { type: 'divider' },
                  { key: 'sign-out', icon: <LogoutOutlined />, label: '退出登录', disabled: true },
                ],
                onClick: onHeaderMenuClick,
              }}
              placement="bottom"
            >
              <div className={styles['header-avatar']} onClick={(event) => event.preventDefault()}>
                <img alt="logo" className={styles['user-avatar']} src="/globe.svg" />
                <span>{displayName}</span>
              </div>
            </Dropdown>
          </div>
        </header>
        <ConfigProvider getPopupContainer={getPopupContainer}>
          <div className={`${styles['main-container']} popup-container`}>{children}</div>
        </ConfigProvider>
        <footer className={styles.footer}>
          <div className={styles['footer-box']}>
            <span>{APP_NAME}</span>
            <span>By</span>
            <a href="https://www.yuque.com/jairwin/blog" rel="noopener noreferrer" target="_blank">
              Jairwin
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
