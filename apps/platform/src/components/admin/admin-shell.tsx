'use client';

import {
  AppstoreOutlined,
  DashboardOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Dropdown, Layout, Menu, type MenuProps, Tooltip } from 'antd';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useMemo, useState } from 'react';
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

function getSelectedKey(pathname: string): string {
  if (pathname === '/admin') {
    return pathname;
  }

  if (pathname.startsWith('/admin/users')) {
    return '/admin/users';
  }

  if (pathname.startsWith('/admin/permissions')) {
    return '/admin/permissions';
  }

  if (pathname.startsWith('/admin/system-settings')) {
    return '/admin/system-settings';
  }

  return '/admin/roles';
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const selectedKey = getSelectedKey(pathname);
  const openKeys = useMemo(() => {
    if (pathname.startsWith('/admin/system-settings')) {
      return ['settings'];
    }

    return pathname === '/admin' ? [] : ['accounts'];
  }, [pathname]);

  return (
    <Layout className={styles.shell} hasSider>
      <Layout.Sider
        className={styles.sider}
        collapsed={collapsed}
        collapsedWidth={72}
        theme="dark"
        trigger={null}
        width={248}
      >
        <div className={styles.brand}>
          <span className={styles['brand-mark']} aria-hidden="true">
            <SafetyCertificateOutlined />
          </span>
          {!collapsed && <span>Control Center</span>}
        </div>
        <Menu
          className={styles.menu}
          defaultOpenKeys={openKeys}
          items={menuItems}
          mode="inline"
          selectedKeys={[selectedKey]}
          theme="dark"
          onClick={({ key }) => {
            if (key.startsWith('/')) {
              router.push(key);
            }
          }}
        />
      </Layout.Sider>

      <Layout className={styles.main}>
        <Layout.Header className={styles.header}>
          <Tooltip title={collapsed ? '展开导航' : '收起导航'}>
            <Button
              aria-label={collapsed ? '展开导航' : '收起导航'}
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              type="text"
              onClick={() => setCollapsed((value) => !value)}
            />
          </Tooltip>
          <div className={styles['header-actions']}>
            <Button icon={<AppstoreOutlined />} type="text">
              管理后台
            </Button>
            <Dropdown
              menu={{
                items: [
                  { key: 'profile', label: '当前会话' },
                  { type: 'divider' },
                  { key: 'sign-out', icon: <LogoutOutlined />, label: '退出登录', disabled: true },
                ],
              }}
              placement="bottomRight"
            >
              <Button className={styles.account} type="text">
                <Avatar size="small">A</Avatar>
                <span>管理员</span>
              </Button>
            </Dropdown>
          </div>
        </Layout.Header>
        <Layout.Content className={styles.content}>{children}</Layout.Content>
      </Layout>
    </Layout>
  );
}
