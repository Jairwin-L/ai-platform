import { z } from 'zod';

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

/** 与 db-service aiProviderOptionSchema 的规则保持一致 */
export const providerFormSchema = z.object({
  value: z
    .string()
    .trim()
    .min(1, '请输入 Provider 标识')
    .max(40)
    .regex(
      /^[a-z][a-z0-9_-]{0,39}$/u,
      'Provider 标识只能包含小写字母、数字、下划线和连字符，且必须以小写字母开头',
    ),
  label: z.string().trim().min(1, '请输入展示名称').max(40),
  apiKeyUrl: z
    .string()
    .trim()
    .max(2048)
    .optional()
    .refine((value) => !value || isHttpsUrl(value), '请输入有效的 https 链接')
    .transform((value) => value || undefined),
  protocol: z.enum(['chat-completions', 'generate-content', 'messages'], '请选择协议'),
  chatBaseUrl: z
    .string()
    .trim()
    .min(1, '请输入调用地址')
    .max(2048)
    .refine(isHttpsUrl, '请输入有效的 https 调用地址'),
  models: z
    .array(z.string().trim())
    .transform((models) => Array.from(new Set(models.filter(Boolean))))
    .refine((models) => models.length > 0, '请至少配置一个模型'),
  enabled: z.boolean(),
});

export type ProviderFormValues = z.input<typeof providerFormSchema>;
