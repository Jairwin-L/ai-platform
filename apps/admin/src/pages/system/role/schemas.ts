import { z } from 'zod';
import { RoleCode, SYSTEM_ROLE_CODES } from '@ai/constants/roles';

/** SUPER_ADMIN 与 SITE_USER 只能由 seed / bootstrap 维护，后台不能创建或修改 */
export const EDITABLE_ROLE_CODES = SYSTEM_ROLE_CODES.filter(
  (code) => code !== RoleCode.SUPER_ADMIN && code !== RoleCode.SITE_USER,
);

/** 与 db-service createRoleSchema 的规则保持一致 */
export const roleFormSchema = z.object({
  code: z
    .string('请选择角色编码')
    .trim()
    .toUpperCase()
    .refine((code) => (EDITABLE_ROLE_CODES as string[]).includes(code), '角色编码不在可编辑范围内'),
  name: z.string('请输入角色名称').trim().min(1, '请输入角色名称').max(80),
  description: z
    .string()
    .trim()
    .max(240, '角色说明最多 240 个字符')
    .optional()
    .transform((value) => value || undefined),
  is_system: z.boolean().default(false),
  status: z.enum(['ENABLED', 'DISABLED']).default('ENABLED'),
  permissions: z.array(z.string()).default([]),
});

export type RoleFormValues = z.input<typeof roleFormSchema>;
