import { z } from 'zod';
import { requiredIdParam } from '@/common/schemas/params';

/** 可空文本：字符串取 trim 结果、空串归一化为 null；未传保持 undefined（不更新该字段） */
function optionalNullableText(maxLength: number, message: string) {
  return z
    .string(message)
    .trim()
    .max(maxLength, message)
    .nullable()
    .optional()
    .transform((value) => (value === undefined ? undefined : value || null));
}

/** 用户在前台编辑自己的资料：只开放昵称与简介 */
export const platformUpdateUserSchema = z
  .object({
    nick_name: optionalNullableText(120, '昵称最多 120 个字符'),
    bio: optionalNullableText(500, '简介最多 500 个字符'),
  })
  .strict();

export const userIdParam = requiredIdParam('用户 ID 不能为空');

export type PlatformUpdateUserInput = z.infer<typeof platformUpdateUserSchema>;
