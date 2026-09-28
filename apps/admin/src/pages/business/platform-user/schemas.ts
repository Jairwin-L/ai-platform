import dayjs, { type Dayjs } from 'dayjs';
import { z } from 'zod';

/**
 * 限制 / 停用 / 封禁平台用户的表单 schema，规则与 db-service updatePlatformUserStatusSchema 一致。
 * 原因是否必填随操作类型变化，所以按操作生成。
 */
export function createStatusFormSchema(reasonRequired: boolean) {
  const reason = z.string('请填写原因').trim().max(255, '原因不能超过 255 个字');

  return z.object({
    reason: reasonRequired ? reason.min(1, '请填写原因') : reason.optional(),
    expiresAt: z
      .custom<Dayjs>((value) => dayjs.isDayjs(value), '截止时间无效')
      .refine((value) => value.isAfter(dayjs()), '截止时间必须晚于当前时间')
      .nullish(),
  });
}

export type StatusFormValues = z.input<ReturnType<typeof createStatusFormSchema>>;
