/**
 * @file
 * 权限编码与面向用户的权限文案映射。
 */

export const PERMISSION_DISPLAY_NAMES: Record<string, string> = {
  ARTICLES: '文章模块',
  'ARTICLES:MANAGEMENT': '文章管理',
  'ARTICLES:VIEW': '查看文章',
  'ARTICLES:ADD': '新增文章',
  'ARTICLES:EDIT': '编辑文章',
  'ARTICLES:DELETE': '删除文章',
} as const;

const MISSING_PERMISSION_FALLBACK = '对应操作';

export function getPermissionDisplayName(code: string): string | undefined {
  return PERMISSION_DISPLAY_NAMES[code];
}

export function getMissingPermissionMessage(codes: string[]): string {
  if (codes.length === 0) {
    return `缺少权限：${MISSING_PERMISSION_FALLBACK}`;
  }

  const names = codes.map(getPermissionDisplayName);

  if (names.some((name) => !name)) {
    return `缺少权限：${MISSING_PERMISSION_FALLBACK}`;
  }

  return `缺少权限：${names.join('、')}`;
}
