import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { Layout, Menu, type MenuProps } from 'antd';
import { LOGIN_PATH, SITE_LOGO_URL, SITE_NAME, VITE_ENV } from '@/constants';
import PageLoading from '@/components/page-loading';
import { useAuthStore } from '@/stores/auth';
import Header from './header';
import { getMenuKeyPath, type MenuItem } from './menus';
import css from './index.module.scss';

const { Sider } = Layout;

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
  // 目录节点的 key 来自服务端权限资源，选中 / 展开都要回溯真实菜单树
  const menuKeyPath = useMemo(() => getMenuKeyPath(menuItems, pathname), [menuItems, pathname]);
  const [openKeys, setOpenKeys] = useState<string[]>(() => menuKeyPath.slice(0, -1));
  const [collapsed, setCollapsed] = useState(false);

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
  };

  const onOpenChange = (nextOpenKeys: string[]) => {
    setOpenKeys(nextOpenKeys);
  };

  if (!initialized || !currentUser) return <PageLoading />;

  return (
    <Layout className={css['layout-wrap']}>
      <Sider
        collapsible
        collapsed={collapsed}
        breakpoint="lg"
        theme="dark"
        className={css['sider-container']}
        onCollapse={setCollapsed}
      >
        <div className={css['logo-box']}>
          <img src={SITE_LOGO_URL} alt="logo" className={css['logo-img']} />
          {collapsed ? null : (
            <span className={css['logo-text']}>{VITE_ENV.VITE_APP_TITLE || SITE_NAME}</span>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          triggerSubMenuAction="click"
          openKeys={collapsed ? [] : openKeys}
          selectedKeys={menuKeyPath.slice(-1)}
          items={menuItems}
          onClick={onChangeMenu}
          onOpenChange={onOpenChange}
        />
      </Sider>
      <Layout>
        <Header />
        <main className={`${css['layout-main']} popup-container`}>
          <Outlet />
        </main>
      </Layout>
    </Layout>
  );
}
