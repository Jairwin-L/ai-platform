import { z } from 'zod';
import { optionalHttpsUrl } from '@/common/schemas/fields';
import { requiredIdParam } from '@/common/schemas/params';

/** 第三方服务配置。规则与 lib/third-party-service-options/options 的 normalizeServiceOption 一致 */
export const thirdPartyServiceOptionSchema = z.object({
  value: z
    .string('请输入服务标识')
    .trim()
    .min(1, '请输入服务标识')
    .max(40)
    .regex(/^[a-z0-9][a-z0-9-]{0,39}$/u, '服务标识只能包含小写字母、数字和连字符'),
  label: z.string('请输入展示名称').trim().min(1, '请输入展示名称').max(40),
  apiKeyUrl: optionalHttpsUrl('请输入有效的 https 链接'),
  enabled: z.boolean('启用状态必须是布尔值'),
});

export const thirdPartyServiceOptionsSchema = z.object({
  options: z
    .array(thirdPartyServiceOptionSchema)
    .refine(
      (options) => new Set(options.map((option) => option.value)).size === options.length,
      '第三方服务标识必须唯一',
    ),
});

export const serviceValueParam = requiredIdParam('URL 中缺少服务标识');

export type ThirdPartyServiceOptionInput = z.infer<typeof thirdPartyServiceOptionSchema>;
export type ThirdPartyServiceOptionsInput = z.infer<typeof thirdPartyServiceOptionsSchema>;
