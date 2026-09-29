import type { MenuProps } from 'antd';
import type { ResourceNode } from '@/api/methods/auth';
import {
  ROUTER_MENU,
  DASHBOARD_PATH,
  getResourceRoutePath,
  getRouteIcon,
  isKnownRoutePath,
} from '@/router/route-registry';

export type MenuItem = Required<MenuProps>['items'][number];

/** 菜单资源变更后广播，App 收到后重新拉取权限树 */
export const MENU_CHANGED_EVENT = 'admin-resource-menu-changed';

/** 能作为菜单展示的资源类型；按钮、数据等权限不进菜单 */
const MENU_RESOURCE_TYPES = ['directory', 'menu', 'system', 'module', 'page'];

function isMenuResource(resource: ResourceNode): boolean {
  return MENU_RESOURCE_TYPES.includes(resource.type);
}

function buildItem(resource: ResourceNode): MenuItem | null {
  if (!resource.enable || !resource.isShow || !isMenuResource(resource)) return null;

  const children = [...(resource.children || [])]
    .sort((left, right) => (left.sort ?? 0) - (right.sort ?? 0))
    .map(buildItem)
    .filter(Boolean) as MenuItem[];
  const path = getResourceRoutePath(resource);
  const isDirectory = children.length > 0 || resource.type === 'directory';

  // 没有子项、又映射不到本地路由的资源直接丢弃，避免点了跳到 404
  if (!isDirectory && !isKnownRoutePath(path)) return null;
  // 下面一个可见子项都没有的目录也不展示，否则它会被当成叶子菜单，点了同样跳 404
  if (isDirectory && children.length === 0) return null;

  return {
    key: path || `resource-${resource.id}`,
    label: resource.name,
    icon: getRouteIcon(resource),
    // 叶子不能带空数组：antd 只要 children 存在就渲染成可展开的子菜单
    children: children.length > 0 ? children : undefined,
  };
}

/**
 * 由服务端权限树生成菜单。
 */
export function buildMenuItems(resources: ResourceNode[]): MenuItem[] {
  return [...resources]
    .sort((left, right) => (left.sort ?? 0) - (right.sort ?? 0))
    .map(buildItem)
    .filter(Boolean) as MenuItem[];
}

/**
 * 本地静态菜单。
 *
 * 权限表尚未初始化（或记录里没有一条能映射到本地路由）时兜底，
 * 否则超级管理员登录后会看到一个空侧边栏，连菜单管理都进不去。
 */
export function getStaticMenuItems(): MenuItem[] {
  const items: MenuItem[] = [];
  const dashboard = ROUTER_MENU.find((meta) => meta.path === DASHBOARD_PATH);
  if (dashboard) {
    items.push({ key: dashboard.path, label: dashboard.title, icon: dashboard.icon });
  }

  ROUTER_MENU.filter((meta) => meta.menu).forEach((directory) => {
    const children = ROUTER_MENU.filter((meta) => {
      if (meta.menu || !meta.route) return false;
      return meta.parent
        ? meta.parent === directory.path
        : meta.path.startsWith(`${directory.path}/`);
    }).map((meta) => ({ key: meta.path, label: meta.title, icon: meta.icon }));
    if (children.length === 0) return;
    items.push({
      key: directory.path,
      label: directory.title,
      icon: directory.icon,
      children,
    });
  });

  return items;
}
