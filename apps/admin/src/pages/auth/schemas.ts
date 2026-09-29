import { z } from 'zod';
import { createZodFormRules } from '@/utils/zod-form-rule';

/** 与 db-service adminLoginSchema 的规则保持一致（密码在前端加密前校验） */
export const loginFormSchema = z.object({
  account: z.string('请输入账号').trim().min(1, '请输入账号').max(100, '账号最多 100 个字符'),
  password: z.string('请输入密码').min(1, '请输入密码').max(128, '密码最多 128 位'),
});

export type LoginFormValues = z.input<typeof loginFormSchema>;

export const getLoginRules = createZodFormRules(loginFormSchema);
