import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { Layout, Menu, type MenuProps } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { LOGIN_PATH } from '@/constants/app';
import PageLoading from '@/components/page-loading';
import { useAuthStore } from '@/stores/auth';
import Header from './header';
import Logo from './logo';
import type { MenuItem } from './menus';
import { getMenuKeyPath } from './util';
import css from './index.module.scss';

const { Sider } = Layout;
const SIDER_WIDTH = 200;
const COLLAPSED_SIDER_WIDTH = 80;
const MOBILE_COLLAPSED_TOGGLE_OFFSET = 16;

interface AppLayoutProps {
  menuItems: MenuItem[];
}

export default function AppLayout({ menuItems }: AppLayoutProps) {
  const navigate = useNavigate();
  const { pathname, search, hash } = useLocation();
  const currentPath = `${pathname}${search}${hash}`;
  const currentUser = useAuthStore((state) => state.currentUser);
  const initialized = useAuthStore((state) => state.initialized);
  const fetchCurrentUser = useAuthStore((state) => state.fetchCurrentUser);
  // 目录节点的 key 来自服务端权限资源，未必等于 URL 前缀，选中 / 展开都要回溯真实菜单树
  const menuKeyPath = useMemo(() => getMenuKeyPath(menuItems, pathname), [menuItems, pathname]);
  const selectedKeys = menuKeyPath.slice(-1);
  const [openKeys, setOpenKeys] = useState<string[]>(() => menuKeyPath.slice(0, -1));
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const collapsedWidth = mobile ? 0 : COLLAPSED_SIDER_WIDTH;
  const siderToggleInlineStart =
    mobile && collapsed
      ? MOBILE_COLLAPSED_TOGGLE_OFFSET
      : (collapsed ? collapsedWidth : SIDER_WIDTH) - 16;

  useEffect(() => {
    if (!initialized) {
      fetchCurrentUser().catch(() => undefined);
    }
  }, [fetchCurrentUser, initialized]);

  // 没有有效会话时退回登录页。能不能进管理端由 db-service 判定：
  // 不持有已启用角色的系统账号登录不进来，角色被收回后 admin 会话也会被作废
  useEffect(() => {
    if (initialized && !currentUser) {
      void navigate(`${LOGIN_PATH}?redirectUrl=${encodeURIComponent(currentPath)}`, {
        replace: true,
      });
    }
  }, [currentPath, currentUser, initialized, navigate]);

  useEffect(() => {
    if (!collapsed) setOpenKeys(menuKeyPath.slice(0, -1));
  }, [collapsed, menuKeyPath]);

  const onChangeMenu: MenuProps['onClick'] = ({ key }) => {
    if (key.startsWith('/')) void navigate(key);
    // 移动端侧栏是浮层，选完菜单就收起，否则会一直盖在内容上
    if (mobile) setCollapsed(true);
  };

  // antd 的 Menu 允许同时展开多个分组，这里收敛成手风琴，侧边栏不会越点越长
  const onOpenChange = (nextOpenKeys: string[]) => {
    if (nextOpenKeys.length <= 1) {
      setOpenKeys(nextOpenKeys);
      return;
    }
    const latestOpenKey = nextOpenKeys[nextOpenKeys.length - 1];
    setOpenKeys(latestOpenKey.includes(nextOpenKeys[0]) ? nextOpenKeys : [latestOpenKey]);
  };

  const onBreakpoint = (broken: boolean) => {
    setMobile(broken);
    setCollapsed(broken);
  };

  const onToggleSider = () => {
    setCollapsed((value) => !value);
  };

  const onCloseMobileSider = () => {
    setCollapsed(true);
  };

  if (!initialized || !currentUser) return <PageLoading />;

  return (
    <Layout className={css['layout-wrap']}>
      <Sider
        collapsible
        breakpoint="lg"
        className={css['sider-container']}
        collapsed={collapsed}
        collapsedWidth={collapsedWidth}
        theme="dark"
        trigger={null}
        width={SIDER_WIDTH}
        onBreakpoint={onBreakpoint}
        onCollapse={setCollapsed}
      >
        <Logo collapsed={collapsed} />
        <Menu
          theme="dark"
          mode="inline"
          triggerSubMenuAction="click"
          openKeys={collapsed ? [] : openKeys}
          selectedKeys={selectedKeys}
          items={menuItems}
          onClick={onChangeMenu}
          onOpenChange={onOpenChange}
        />
      </Sider>
      <button
        type="button"
        aria-label={collapsed ? '展开导航' : '收起导航'}
        className={css['sider-toggle']}
        style={{ insetInlineStart: siderToggleInlineStart }}
        onClick={onToggleSider}
      >
        {collapsed ? <RightOutlined /> : <LeftOutlined />}
      </button>
      {mobile && !collapsed ? (
        <button
          type="button"
          aria-label="关闭导航"
          className={css['sider-mask']}
          onClick={onCloseMobileSider}
        />
      ) : null}
      <Layout>
        <Header />
        <main className={`${css['layout-main-container']} table-layout-main popup-container`}>
          <Outlet />
        </main>
      </Layout>
    </Layout>
  );
}
