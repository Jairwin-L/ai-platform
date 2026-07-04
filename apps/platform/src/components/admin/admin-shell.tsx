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
import { useEffect, useState } from 'react';
import { APP_BLACK_LOGO, APP_NAME } from '@/constants';
import { usePermission } from '@/hooks/use-permission';
import styles from './admin-shell.module.scss';
import { APP_WHITE_LOGO } from '@/constants/app';

const menuItems: IComponent.AdminMenuItem[] = [
  { key: '/admin', icon: <DashboardOutlined />, label: '概览' },
  {
    key: '/admin/system',
    icon: <SettingOutlined />,
    label: '系统管理',
    children: [
      {
        key: '/admin/access-control',
        icon: <TeamOutlined />,
        label: '权限管理',
        children: [
          { key: '/admin/users', label: '用户' },
          { key: '/admin/roles', label: '角色' },
          { key: '/admin/permissions', label: '权限' },
        ],
      },
      {
        key: '/admin/settings-group',
        label: '系统配置',
        children: [
          { key: '/admin/settings', label: '基础配置' },
          { key: '/admin/settings/ai-provider', label: 'AI Provider' },
          { key: '/admin/settings/third-party-service', label: '第三方服务' },
        ],
      },
    ],
  },
];

function getMenuPaths(items: IComponent.AdminMenuItem[], parentKeys: string[] = []): string[][] {
  return items.flatMap((menuItem) => {
    const menuPath = [...parentKeys, menuItem.key];

    return menuItem.children ? getMenuPaths(menuItem.children, menuPath) : [menuPath];
  });
}

const menuPaths = getMenuPaths(menuItems);

function getCurrentMenuPath(pathname: string): string[] | undefined {
  const menuSelectedKey = pathname.match(/^(.*)\/(?:create|edit)(?:\/|$)/);
  const selectedPathname = menuSelectedKey?.[1] ?? pathname;
  let currentMenuPath: string[] | undefined;

  for (const menuPath of menuPaths) {
    const menuKey = menuPath.at(-1);

    if (
      menuKey &&
      (selectedPathname === menuKey ||
        (menuKey !== '/admin' && selectedPathname.startsWith(`${menuKey}/`))) &&
      (!currentMenuPath || menuKey.length > currentMenuPath.at(-1)!.length)
    ) {
      currentMenuPath = menuPath;
    }
  }

  return currentMenuPath;
}

export function AdminShell({ children }: IComponent.AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = usePermission();
  const [collapsed, setCollapsed] = useState(false);
  const currentMenuPath = getCurrentMenuPath(pathname);
  const [openKeys, setOpenKeys] = useState<string[]>(() => currentMenuPath?.slice(0, -1) ?? []);
  const selectedKey = currentMenuPath?.at(-1);
  const displayName = user?.nickName || user?.email || '--';

  useEffect(() => {
    if (!collapsed) {
      setOpenKeys(getCurrentMenuPath(pathname)?.slice(0, -1) ?? []);
    }
  }, [collapsed, pathname]);

  function onMenuOpenChange(nextOpenKeys: string[]): void {
    setOpenKeys(nextOpenKeys);
  }
  function onChangeMenu(menuProps: Parameters<NonNullable<MenuProps['onClick']>>[0]) {
    const { key } = menuProps;
    router.push(key);
  }

  function onHeaderMenuClick({ key }: { key: string }): void {
    if (key === 'PLATFORM') {
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
          <img alt={APP_NAME} className={styles['logo-img']} src={APP_WHITE_LOGO} />
          {!collapsed && <span className={styles['logo-text']}>Control Center</span>}
        </div>
        <Menu
          items={menuItems as MenuProps['items']}
          mode="inline"
          openKeys={collapsed ? [] : openKeys}
          selectedKeys={selectedKey ? [selectedKey] : []}
          theme="dark"
          triggerSubMenuAction="click"
          onClick={onChangeMenu}
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
                  { key: 'PLATFORM', icon: <AppstoreOutlined />, label: '平台' },
                  { type: 'divider' },
                  { key: 'SIGN_OUT', icon: <LogoutOutlined />, label: '退出登录', disabled: true },
                ],
                onClick: onHeaderMenuClick,
              }}
              placement="bottom"
            >
              <div className={styles['header-avatar']} onClick={(event) => event.preventDefault()}>
                <img alt={APP_NAME} className={styles['user-avatar']} src={APP_BLACK_LOGO} />
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
