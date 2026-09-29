import { z } from 'zod';
import { BYOK_PROVIDER_VALUE_PATTERN } from '@/lib/ai/byok/constants';
import { optionalHttpsUrl, requiredHttpsUrl } from '@/common/schemas/fields';
import { requiredIdParam } from '@/common/schemas/params';

/**
 * AI Provider 配置。规则与 lib/ai/byok/provider-options 的 normalizeProviderOption 一致，
 * 放在入口处校验是为了让字段级文案直接返回给后台；落库前 store 还会再归一化一次。
 */
export const aiProviderOptionSchema = z.object({
  value: z
    .string('请输入 Provider 标识')
    .trim()
    .min(1, '请输入 Provider 标识')
    .max(40)
    .regex(
      BYOK_PROVIDER_VALUE_PATTERN,
      'Provider 标识只能包含小写字母、数字、下划线和连字符，且必须以小写字母开头',
    ),
  label: z.string('请输入展示名称').trim().min(1, '请输入展示名称').max(40),
  apiKeyUrl: optionalHttpsUrl('请输入有效的 https 链接'),
  protocol: z.enum(['chat-completions', 'generate-content', 'messages'], '协议不受支持'),
  chatBaseUrl: requiredHttpsUrl('请输入有效的 https 调用地址'),
  models: z
    .array(z.string().trim().min(1).max(128))
    .min(1, '请至少配置一个模型')
    .refine((models) => new Set(models).size === models.length, '模型列表包含重复项'),
  enabled: z.boolean('启用状态必须是布尔值'),
});

export const aiProviderOptionsSchema = z.object({
  options: z
    .array(aiProviderOptionSchema)
    .refine(
      (options) => new Set(options.map((option) => option.value)).size === options.length,
      'AI Provider 标识必须唯一',
    ),
});

export const providerValueParam = requiredIdParam('URL 中缺少 Provider 标识');

export type AiProviderOptionInput = z.infer<typeof aiProviderOptionSchema>;
export type AiProviderOptionsInput = z.infer<typeof aiProviderOptionsSchema>;
