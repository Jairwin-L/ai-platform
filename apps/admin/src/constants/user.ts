import type { TagProps } from 'antd';

/** 与 db-service 的 UserStatusType 一一对应 */
export const USER_STATUS_OPTIONS: Array<{
  color: NonNullable<TagProps['color']>;
  label: string;
  value: IApiUsers.UserStatus;
}> = [
  { color: 'success', label: '正常', value: 'active' },
  { color: 'warning', label: '待激活', value: 'pending' },
  { color: 'warning', label: '受限', value: 'restricted' },
  { color: 'error', label: '已封禁', value: 'banned' },
  { color: 'default', label: '已停用', value: 'inactive' },
];

export function getUserStatusMeta(status: string) {
  return USER_STATUS_OPTIONS.find((item) => item.value === status);
}
