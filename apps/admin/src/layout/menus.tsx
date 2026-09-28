import type { MenuProps } from 'antd';
import type { ResourceNode } from '@/api/methods/auth';
import { DASHBOARD_PATH } from '@/constants/app';
import {
  ROUTER_MENU,
  getResourceRoutePath,
  getRouteIcon,
  isKnownRoutePath,
} from '@/router/route-registry';

export type MenuItem = Required<MenuProps>['items'][number];

/** 菜单资源变更后广播，App 收到后重新拉取权限树 */
export const MENU_CHANGED_EVENT = 'admin-resource-menu-changed';

/** 能作为菜单展示的资源类型；按钮、数据等权限不进菜单 */
const MENU_RESOURCE_TYPES = new Set(['directory', 'menu', 'system', 'module', 'page']);

function sortResources(resources: ResourceNode[]): ResourceNode[] {
  return [...resources].sort((left, right) => (left.sort ?? 0) - (right.sort ?? 0));
}

function buildItem(resource: ResourceNode): MenuItem | null {
  if (!resource.enable || !resource.isShow || !MENU_RESOURCE_TYPES.has(resource.type)) {
    return null;
  }

  const children = sortResources(resource.children ?? [])
    .map(buildItem)
    .filter(Boolean) as MenuItem[];
  const path = getResourceRoutePath(resource);
  const isDirectory = children.length > 0 || resource.type === 'directory';

  // 没有子项、又映射不到本地路由的资源直接丢弃，避免点了跳到 404
  if (!isDirectory && !isKnownRoutePath(path)) return null;
  // 下面一个可见子项都没有的目录也不展示，否则侧边栏会出现点不开的空分组
  if (isDirectory && children.length === 0) return null;

  return {
    key: isDirectory ? `resource-${resource.id}` : path,
    label: resource.name,
    icon: getRouteIcon(resource),
    children: isDirectory ? children : undefined,
  };
}

/** 由服务端权限树生成菜单 */
export function buildMenuItems(resources: ResourceNode[]): MenuItem[] {
  return sortResources(resources).map(buildItem).filter(Boolean) as MenuItem[];
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

  const directoryIndexes = ROUTER_MENU.map((meta, index) => (meta.menu ? index : -1)).filter(
    (index) => index >= 0,
  );
  directoryIndexes.forEach((start, position) => {
    const directory = ROUTER_MENU[start];
    const end = directoryIndexes[position + 1] ?? ROUTER_MENU.length;
    // 注册表按「目录 → 所属页面」顺序排列，目录之后、下一个目录之前的页面都挂在它下面
    const children = ROUTER_MENU.slice(start + 1, end)
      .filter((meta) => meta.route)
      .map((meta) => ({ key: meta.path, label: meta.title, icon: meta.icon }));
    if (children.length === 0) return;
    items.push({ key: directory.path, label: directory.title, icon: directory.icon, children });
  });

  return items;
}

/** 只取遍历需要的两个字段，避开 antd MenuItem 联合类型的窄化成本 */
interface MenuKeyNode {
  key?: string | number | null;
  children?: MenuKeyNode[];
}

/** 叶子菜单从根到自身的 key 链 */
function getMenuKeyPaths(items: MenuItem[], parentKeys: string[] = []): string[][] {
  return items.flatMap((item) => {
    const node = item as MenuKeyNode | null;
    if (!node || node.key === undefined || node.key === null) return [];

    const keyPath = [...parentKeys, String(node.key)];
    return node.children?.length
      ? getMenuKeyPaths(node.children as MenuItem[], keyPath)
      : [keyPath];
  });
}

/**
 * 在真实菜单树里定位当前路径对应的叶子，返回它的祖先 key 链：新增 / 编辑 / 详情页高亮其所属列表页。
 * 目录节点的 key 由服务端权限资源决定，父级只能回溯菜单树，不能从路径字符串拼。
 */
export function getMenuKeyPath(items: MenuItem[], pathname: string): string[] {
  const selectedPath = pathname.match(/(\S*)\/(detail|create|edit)(\/|$)/)?.[1] || pathname;
  let matched: string[] | undefined;

  for (const keyPath of getMenuKeyPaths(items)) {
    const key = keyPath[keyPath.length - 1];
    if (!key.startsWith('/')) continue;
    if (selectedPath !== key && !selectedPath.startsWith(`${key}/`)) continue;
    // 同时命中父子路由时取更长的那个
    if (!matched || key.length > matched[matched.length - 1].length) matched = keyPath;
  }

  return matched ?? [];
}
