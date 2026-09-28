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

/** 平台用户列表的状态筛选：只关心被处置过的账号 */
export const PLATFORM_USER_STATUS_FILTERS: IApiAdmin.PlatformUserStatus[] = [
  'restricted',
  'banned',
  'inactive',
];

export interface PlatformUserStatusAction {
  /** 操作按钮文案 */
  action: string;
  danger?: boolean;
  /** 弹窗里说明设置后对用户的影响 */
  description: string;
  /** 是否必须填写原因 */
  reasonRequired: boolean;
  status: Exclude<IApiAdmin.PlatformUserStatus, 'active'>;
  /** 是否支持截止时间（到期自动恢复正常） */
  timed: boolean;
}

/** 与 db-service updatePlatformUserStatusSchema 的规则保持一致 */
export const PLATFORM_USER_STATUS_ACTIONS: PlatformUserStatusAction[] = [
  {
    action: '限制',
    description:
      '受限后用户仍可登录浏览，但无法修改资料、上传或压缩图片、使用 AI 对话或修改密钥与凭据。',
    reasonRequired: true,
    status: 'restricted',
    timed: true,
  },
  {
    action: '停用',
    description: '停用后用户会立即退出登录且无法再登录，需要手动恢复。',
    reasonRequired: false,
    status: 'inactive',
    timed: false,
  },
  {
    action: '封禁',
    danger: true,
    description: '封禁后用户会立即退出登录且无法再登录。',
    reasonRequired: true,
    status: 'banned',
    timed: true,
  },
];
