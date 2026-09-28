import { z } from 'zod';

/** 与 db-service adminLoginSchema 的规则保持一致（密码在前端加密前校验） */
export const loginFormSchema = z.object({
  email: z.string().trim().toLowerCase().email('邮箱格式不正确').max(254),
  password: z.string().min(1, '请输入密码').max(128, '密码最多 128 位'),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;
