import { z } from 'zod';

/** 与 db-service adminUpdateUserSchema 的规则保持一致 */
const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => value || null);

export const userFormSchema = z.object({
  full_name: optionalText(120, '姓名最多 120 个字符'),
  nick_name: optionalText(120, '昵称最多 120 个字符'),
  user_name: optionalText(120, '用户名最多 120 个字符'),
  bio: optionalText(500, '简介最多 500 个字符'),
  status: z.enum(['active', 'pending', 'restricted', 'banned', 'inactive'], '请选择用户状态'),
  roleIds: z.array(z.number().int().positive()).default([]),
});

export type UserFormValues = z.input<typeof userFormSchema>;
