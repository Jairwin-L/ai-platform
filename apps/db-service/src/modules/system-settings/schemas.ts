import { z } from 'zod';

const supportedLanguages = ['zh-CN', 'en-US'] as const;
const supportedSessionPolicies = ['standard', 'strict'] as const;

/**
 * BYOK 允许来源：每行（或逗号分隔）一个精确 origin。
 * 不允许通配符与路径：这份名单是 BYOK 保存密钥、发起对话的来源校验依据。
 */
const byokAllowedOriginsSchema = z
  .string('byokAllowedOrigins 必须是字符串')
  .trim()
  .max(2000, 'byokAllowedOrigins 无效')
  .nullish()
  .transform((value, context) => {
    const origins = (value ?? '')
      .split(/[\n,]/u)
      .map((origin) => origin.trim())
      .filter(Boolean);
    const normalized: string[] = [];

    for (const origin of origins) {
      if (origin === '*') {
        context.addIssue({ code: 'custom', message: 'BYOK Origin 不允许使用通配符' });
        return z.NEVER;
      }

      let parsed: URL;
      try {
        parsed = new URL(origin);
      } catch {
        context.addIssue({ code: 'custom', message: 'BYOK Origin 格式无效' });
        return z.NEVER;
      }

      if (
        parsed.origin !== origin ||
        parsed.pathname !== '/' ||
        parsed.search ||
        parsed.hash ||
        !['http:', 'https:'].includes(parsed.protocol)
      ) {
        context.addIssue({
          code: 'custom',
          message: 'BYOK Origin 必须是精确 origin，例如 https://example.com',
        });
        return z.NEVER;
      }

      if (!normalized.includes(parsed.origin)) normalized.push(parsed.origin);
    }

    return normalized.join('\n');
  });

/** 系统设置更新：字段级校验失败返回 400 + 字段文案，存储失败由 service 单独处理 */
export const updateSystemSettingsSchema = z.object({
  displayName: z
    .string('displayName 必须是字符串')
    .trim()
    .min(1, '请输入显示名称')
    .max(80, 'displayName 无效'),
  supportEmail: z.preprocess(
    (value) => (value === undefined || value === null || value === '' ? null : value),
    z
      .string()
      .trim()
      .max(254)
      .regex(/^\S+@\S+\.\S+$/, '支持邮箱无效')
      .nullable(),
  ),
  defaultLanguage: z.enum(supportedLanguages, 'defaultLanguage 不受支持'),
  allowRegistration: z.boolean('allowRegistration 必须是布尔值'),
  maintenanceMode: z.boolean('maintenanceMode 必须是布尔值'),
  sessionPolicy: z.enum(supportedSessionPolicies, 'sessionPolicy 不受支持'),
  byokAllowedOrigins: byokAllowedOriginsSchema,
});

export type UpdateSystemSettingsInput = z.infer<typeof updateSystemSettingsSchema>;
