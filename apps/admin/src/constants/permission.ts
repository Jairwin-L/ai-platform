/** 与 db-service 的 PermissionType 一一对应；directory / menu 生成侧边栏，button 是按钮级权限码 */
export const PERMISSION_TYPE_OPTIONS: Array<{
  color: string;
  label: string;
  value: IApiAdmin.PermissionKind;
}> = [
  { color: 'geekblue', label: '目录', value: 'directory' },
  { color: 'blue', label: '菜单', value: 'menu' },
  { color: 'green', label: '按钮', value: 'button' },
  { color: 'purple', label: '系统', value: 'system' },
  { color: 'cyan', label: '模块', value: 'module' },
  { color: 'blue', label: '页面', value: 'page' },
  { color: 'green', label: '操作', value: 'operation' },
  { color: 'orange', label: '数据', value: 'data' },
];

export function getPermissionTypeMeta(type: string) {
  return PERMISSION_TYPE_OPTIONS.find((item) => item.value === type);
}

/** 按钮 / 操作是叶子权限，下面不再挂子资源 */
export const LEAF_PERMISSION_TYPES: IApiAdmin.PermissionKind[] = ['button', 'operation'];

/** 与 db-service 的 AI Provider 协议一一对应 */
export const PROVIDER_PROTOCOL_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'Chat Completions', value: 'chat-completions' },
  { label: 'Messages', value: 'messages' },
  { label: 'Generate Content', value: 'generate-content' },
];
