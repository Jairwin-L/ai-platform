import { z } from 'zod';

/** 与 db-service createPermissionSchema 的规则保持一致 */
export const permissionFormSchema = z.object({
  name: z.string('请输入权限名称').trim().min(1, '请输入权限名称').max(80),
  code: z
    .string('请输入权限编码')
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9_]*(?::[A-Z0-9_]+)*$/, '权限编码格式不正确，例如 ARTICLES:VIEW')
    .max(120),
  type: z.enum(['system', 'page', 'module', 'operation', 'data'], '请选择权限类型'),
  description: z
    .string()
    .trim()
    .max(240, '说明最多 240 个字符')
    .optional()
    .transform((value) => value || undefined),
  parent_id: z
    .string()
    .optional()
    .nullable()
    .transform((value) => (value ? Number(value) : null)),
});

export type PermissionFormValues = z.input<typeof permissionFormSchema>;
