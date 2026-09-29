/**
 * @file 侧边栏菜单的选中态与展开态计算。
 */
import type { MenuItem } from './menus';

/** 只取遍历需要的两个字段，避开 antd MenuItem 联合类型的窄化成本 */
interface MenuKeyNode {
  key?: string | number | null;
  children?: MenuKeyNode[];
}

/**
 * @func getMenuKeyPaths
 * @desc 展开菜单树，返回每个叶子节点从根到自身的 key 链。
 * @param {MenuItem[]} items 菜单项。
 * @param {string[]} [parentKeys] 递归时携带的父级 key 链。
 * @returns {string[][]} 所有叶子节点的 key 链。
 */
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
 * @func getSelectedKey
 * @desc 由当前路径推导菜单选中项；新增 / 编辑 / 详情页高亮其所属列表页。
 * @param {string} path 当前访问路径。
 * @returns {string} 菜单选中的 key。
 * @example
 *
 * getSelectedKey('/system/user/edit/1'); // => '/system/user'
 *
 */
export function getSelectedKey(path: string): string {
  return path.match(/(\S*)\/(detail|create|edit)(\/|$)/)?.[1] || path;
}

/**
 * @func getMenuKeyPath
 * @desc 在真实菜单树里定位当前路径对应的叶子，返回它的祖先 key 链。
 *       目录节点的 key 由服务端权限资源决定，未必等于 URL 前缀，
 *       所以父级只能回溯菜单树，不能从路径字符串拼。
 * @param {MenuItem[]} items 菜单项。
 * @param {string} pathname 当前访问路径。
 * @returns {string[]} 从根到当前项的 key 链；未命中时为空数组。
 * @example
 *
 * getMenuKeyPath(items, '/system/user/edit/1'); // => ['resource-12', '/system/user']
 *
 */
export function getMenuKeyPath(items: MenuItem[], pathname: string): string[] {
  const selectedPath = getSelectedKey(pathname);
  let matched: string[] | undefined;

  for (const keyPath of getMenuKeyPaths(items)) {
    const key = keyPath[keyPath.length - 1];
    // 只有路由型 key 参与匹配，目录退化出的 `resource-<id>` 不该被选中
    if (!key.startsWith('/')) continue;
    if (selectedPath !== key && !selectedPath.startsWith(`${key}/`)) continue;
    // 同时命中父子路由时取更长的那个
    if (!matched || key.length > matched[matched.length - 1].length) matched = keyPath;
  }

  return matched ?? [];
}
