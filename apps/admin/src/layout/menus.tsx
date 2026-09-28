import type { MenuProps } from 'antd';
import { MENU_ROUTES, type MenuRoute } from '@/router/route-registry';

export type MenuItem = Required<MenuProps>['items'][number];

function toMenuItem(menu: MenuRoute): MenuItem {
  return {
    key: menu.path,
    label: menu.title,
    icon: menu.icon,
    children: menu.children?.map(toMenuItem),
  };
}

export const MENU_ITEMS: MenuItem[] = MENU_ROUTES.map(toMenuItem);

/** 叶子菜单从根到自身的 key 链，用于推导选中与展开态 */
function getMenuKeyPaths(menus: MenuRoute[], parentKeys: string[] = []): string[][] {
  return menus.flatMap((menu) => {
    const keyPath = [...parentKeys, menu.path];
    return menu.children?.length ? getMenuKeyPaths(menu.children, keyPath) : [keyPath];
  });
}

const MENU_KEY_PATHS = getMenuKeyPaths(MENU_ROUTES);

/**
 * 由当前路径推导菜单 key 链：新增 / 编辑 / 详情页高亮其所属列表页；
 * 同时命中父子路由时取更长的那个。
 */
export function getMenuKeyPath(pathname: string): string[] {
  const selectedPath = pathname.match(/(\S*)\/(detail|create|edit)(\/|$)/)?.[1] || pathname;
  let matched: string[] | undefined;

  for (const keyPath of MENU_KEY_PATHS) {
    const key = keyPath[keyPath.length - 1];
    if (selectedPath !== key && !selectedPath.startsWith(`${key}/`)) continue;
    if (!matched || key.length > matched[matched.length - 1].length) matched = keyPath;
  }

  return matched ?? [];
}
