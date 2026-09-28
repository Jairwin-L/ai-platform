import { z } from 'zod';

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

/** 与 db-service thirdPartyServiceOptionSchema 的规则保持一致 */
export const serviceFormSchema = z.object({
  value: z
    .string()
    .trim()
    .min(1, '请输入服务标识')
    .max(40)
    .regex(/^[a-z0-9][a-z0-9-]{0,39}$/u, '服务标识只能包含小写字母、数字和连字符'),
  label: z.string().trim().min(1, '请输入展示名称').max(40),
  apiKeyUrl: z
    .string()
    .trim()
    .max(2048)
    .optional()
    .refine((value) => !value || isHttpsUrl(value), '请输入有效的 https 链接')
    .transform((value) => value || undefined),
  enabled: z.boolean(),
});

export type ServiceFormValues = z.input<typeof serviceFormSchema>;
