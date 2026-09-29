import type { UserStatusType } from '@/generated/prisma/client';

export type InactiveUserStatus = Exclude<UserStatusType, 'active'>;

export interface AccountStatusDetail {
  reason?: string | null;
  expiresAt?: Date | string | null;
}

/** 平台用户只有正常、受限、已封禁、已停用四种状态 */
type PlatformInactiveStatus = 'restricted' | 'banned' | 'inactive';

const ACCOUNT_STATUS_MESSAGES: Record<PlatformInactiveStatus, string> = {
  restricted: '账号已被限制使用，请联系管理员',
  banned: '账号已被封禁',
  inactive: '账号已被停用，请联系管理员',
};

const RESTRICTED_ACTION_MESSAGE = '账号已被限制使用，暂时无法进行此操作';

function isPlatformInactiveStatus(status: InactiveUserStatus): status is PlatformInactiveStatus {
  return status in ACCOUNT_STATUS_MESSAGES;
}

// 截止时间统一按北京时间展示，避免服务器时区不同导致文案漂移
function formatExpiresAt(value: Date | string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

function withDetail(base: string, detail?: AccountStatusDetail): string {
  const parts = [base];
  if (detail?.reason) parts.push(`原因：${detail.reason}`);
  if (detail?.expiresAt) parts.push(`解除时间：${formatExpiresAt(detail.expiresAt)}`);
  return parts.join('；');
}

/**
 * 非 active 平台用户被拒绝登录或会话被作废时的提示，带上后台填写的原因与解除时间。
 * 错误码仍统一是 ACCOUNT_DISABLED，文案按状态区分；数据库枚举里平台用户用不到的值按停用处理。
 */
export function getAccountStatusMessage(
  status: InactiveUserStatus,
  detail?: AccountStatusDetail,
): string {
  const message = isPlatformInactiveStatus(status)
    ? ACCOUNT_STATUS_MESSAGES[status]
    : ACCOUNT_STATUS_MESSAGES.inactive;
  return withDetail(message, detail);
}

/** 受限用户调用写接口被拦截时的提示 */
export function getRestrictedActionMessage(detail?: AccountStatusDetail): string {
  return withDetail(RESTRICTED_ACTION_MESSAGE, detail);
}
