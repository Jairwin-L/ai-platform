import { z } from 'zod';
import { createZodFormRules } from '@/utils/zod-form-rule';

/** 与 db-service updateSystemSettingsSchema 的规则保持一致（BYOK 来源的精确格式由服务端校验） */
export const settingsFormSchema = z.object({
  displayName: z.string().trim().min(1, '请输入显示名称').max(80, '显示名称最多 80 个字符'),
  supportEmail: z
    .string()
    .trim()
    .max(254)
    .refine((value) => !value || /^\S+@\S+\.\S+$/.test(value), '支持邮箱无效')
    .default(''),
  defaultLanguage: z.enum(['zh-CN', 'en-US']),
  allowRegistration: z.boolean(),
  maintenanceMode: z.boolean(),
  sessionPolicy: z.enum(['standard', 'strict']),
  byokAllowedOrigins: z.string().trim().max(2000, 'BYOK 允许来源最多 2000 个字符').default(''),
});

export type SettingsFormValues = z.input<typeof settingsFormSchema>;

export const getSettingsRules = createZodFormRules(settingsFormSchema);
