import { useCallback, useEffect, useRef, useState } from 'react';
import { RouterProvider } from 'react-router';
import { App as AntdApp, ConfigProvider, theme, type ThemeConfig } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import 'dayjs/locale/zh-cn';
import { getCurrentMenus, type AuthAccount, type ResourceNode } from '@/api/methods/auth';
import PageLoading from '@/components/page-loading';
import { MENU_CHANGED_EVENT, buildMenuItems, getStaticMenuItems } from '@/layout/menus';
import { isAdminRole, useAuthStore } from '@/stores/auth';
import { createAdminRouter } from './routes';

const { colorPrimary, colorPrimaryBg } = theme.getDesignToken();

/**
 * 侧栏保留深色，但深色菜单默认用主色实底白字标记选中项。
 * 这里把选中项换回 design.md 规定的浅蓝底 + 主色字，让「当前位置」在深浅两种菜单里是同一个视觉信号。
 * 取值读默认主题的派生 token，不手写色值。
 */
const THEME_CONFIG: ThemeConfig = {
  components: {
    Menu: {
      darkItemSelectedBg: colorPrimaryBg,
      darkItemSelectedColor: colorPrimary,
    },
  },
};

/**
 * antd 的浮层默认挂到 body，表格横向滚动时下拉会脱离容器，
 * 这里把选择器/时间选择器的浮层挂到内容区，跟随滚动。
 */
function getPopupContainer(node?: HTMLElement): HTMLElement {
  const popupContainer = document.querySelector<HTMLElement>('.popup-container');
  if (
    node &&
    (node.className.includes('ant-select-selector') || node.className.includes('ant-picker'))
  ) {
    return popupContainer || document.body;
  }
  return document.body;
}

export default function App() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const initialized = useAuthStore((state) => state.initialized);
  const fetchCurrentUser = useAuthStore((state) => state.fetchCurrentUser);
  // 记录路由表是为哪个账号建的：登录 / 切换账号后旧路由表里没有目标页面，
  // 继续用它渲染会先命中 `*` 闪一下 404，要等新路由表建好再挂载
  const [routerState, setRouterState] = useState<{
    router: ReturnType<typeof createAdminRouter>;
    user: AuthAccount | null;
  } | null>(null);
  // 菜单接口是异步的，账号快速切换时只认最后一次请求的结果
  const loadRequestId = useRef(0);

  const loadRouter = useCallback(async () => {
    const requestId = ++loadRequestId.current;

    if (!currentUser) {
      setRouterState({ router: createAdminRouter([]), user: null });
      return;
    }

    let resources: ResourceNode[] = [];
    try {
      resources = await getCurrentMenus();
    } catch {
      // 菜单接口失败时超级管理员退回本地静态菜单，至少保证后台能进
      resources = [];
    }
    if (requestId !== loadRequestId.current) return;

    const menuItems = buildMenuItems(resources);
    // 全量兜底只给超级管理员：普通系统用户拿不到菜单就应该什么都看不到，而不是看到全部页面
    const allowFallback = isAdminRole(currentUser.roles);
    setRouterState({
      router: createAdminRouter(resources, {
        allowFallback,
        menuItems: menuItems.length > 0 || !allowFallback ? menuItems : getStaticMenuItems(),
      }),
      user: currentUser,
    });
  }, [currentUser]);

  const router = routerState?.user === currentUser ? routerState.router : null;

  useEffect(() => {
    if (!initialized) {
      fetchCurrentUser().catch(() => undefined);
    }
  }, [fetchCurrentUser, initialized]);

  useEffect(() => {
    if (!initialized) return;
    loadRouter().catch(() => undefined);
    const onMenuChanged = () => {
      loadRouter().catch(() => undefined);
    };
    window.addEventListener(MENU_CHANGED_EVENT, onMenuChanged);
    return () => window.removeEventListener(MENU_CHANGED_EVENT, onMenuChanged);
  }, [initialized, loadRouter]);

  return (
    <ConfigProvider locale={zhCN} theme={THEME_CONFIG} getPopupContainer={getPopupContainer}>
      <AntdApp>{router ? <RouterProvider router={router} /> : <PageLoading />}</AntdApp>
    </ConfigProvider>
  );
}
