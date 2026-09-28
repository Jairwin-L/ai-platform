import { describe, expect, it } from 'vite-plus/test';
import {
  getEffectiveStatusFields,
  isStatusExpired,
} from '@/infra/permissions/platform-user-status';
import { updatePlatformUserStatusSchema } from '@/modules/auth/users/schemas';

const future = () => new Date(Date.now() + 60 * 60 * 1000).toISOString();
const past = () => new Date(Date.now() - 60 * 1000).toISOString();

describe('updatePlatformUserStatusSchema', () => {
  it('受限与封禁必须填写原因', () => {
    for (const status of ['restricted', 'banned']) {
      expect(updatePlatformUserStatusSchema.safeParse({ status }).success).toBe(false);
      expect(updatePlatformUserStatusSchema.safeParse({ status, reason: '  ' }).success).toBe(
        false,
      );
      expect(updatePlatformUserStatusSchema.safeParse({ status, reason: '刷屏' }).success).toBe(
        true,
      );
    }
  });

  it('停用原因可选，但不能设置截止时间', () => {
    expect(updatePlatformUserStatusSchema.safeParse({ status: 'inactive' }).success).toBe(true);
    expect(
      updatePlatformUserStatusSchema.safeParse({ status: 'inactive', expiresAt: future() }).success,
    ).toBe(false);
  });

  it('截止时间必须晚于当前时间，并转换为 Date', () => {
    expect(
      updatePlatformUserStatusSchema.safeParse({ status: 'banned', reason: 'x', expiresAt: past() })
        .success,
    ).toBe(false);

    const parsed = updatePlatformUserStatusSchema.parse({
      status: 'banned',
      reason: 'x',
      expiresAt: future(),
    });
    expect(parsed.expiresAt).toBeInstanceOf(Date);
  });

  it('平台用户没有待激活状态', () => {
    expect(updatePlatformUserStatusSchema.safeParse({ status: 'pending' }).success).toBe(false);
  });
});

describe('平台用户状态到期', () => {
  it('没有截止时间永不过期', () => {
    expect(isStatusExpired(null)).toBe(false);
  });

  it('到期的受限 / 封禁按正常处理，并清空原因', () => {
    const effective = getEffectiveStatusFields({
      status: 'banned',
      status_reason: '违规',
      status_expires_at: new Date(Date.now() - 1000),
    });
    expect(effective).toEqual({ status: 'active', statusReason: null, statusExpiresAt: null });
  });

  it('未到期时保留原状态与原因', () => {
    const expiresAt = new Date(Date.now() + 60_000);
    const effective = getEffectiveStatusFields({
      status: 'restricted',
      status_reason: '刷屏',
      status_expires_at: expiresAt,
    });
    expect(effective).toEqual({
      status: 'restricted',
      statusReason: '刷屏',
      statusExpiresAt: expiresAt.toISOString(),
    });
  });
});
