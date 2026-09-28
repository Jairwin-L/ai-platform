/** 与 db-service 的 PermissionType 一一对应 */
export const PERMISSION_TYPE_OPTIONS: Array<{
  color: string;
  label: string;
  value: IApiAdmin.PermissionType;
}> = [
  { color: 'default', label: '系统', value: 'system' },
  { color: 'processing', label: '页面', value: 'page' },
  { color: 'processing', label: '模块', value: 'module' },
  { color: 'success', label: '操作', value: 'operation' },
  { color: 'warning', label: '数据', value: 'data' },
];

export function getPermissionTypeMeta(type: string) {
  return PERMISSION_TYPE_OPTIONS.find((item) => item.value === type);
}

/** 与 db-service 的 AI Provider 协议一一对应 */
export const PROVIDER_PROTOCOL_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'Chat Completions', value: 'chat-completions' },
  { label: 'Messages', value: 'messages' },
  { label: 'Generate Content', value: 'generate-content' },
];
