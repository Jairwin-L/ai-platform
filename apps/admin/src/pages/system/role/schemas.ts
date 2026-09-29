import { z } from 'zod';
import { createZodFormRules } from '@/utils/zod-form-rule';

/** 与 db-service createRoleSchema 的规则保持一致 */
const ROLE_CODE_PATTERN = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;

export const roleFormSchema = z.object({
  code: z
    .string('请输入角色编码')
    .trim()
    .toUpperCase()
    .regex(ROLE_CODE_PATTERN, '角色编码使用大写常量格式，如 CONTENT_REVIEWER')
    .max(50, '角色编码最多 50 个字符'),
  name: z.string('请输入角色名称').trim().min(1, '请输入角色名称').max(50, '最多 50 个字符'),
  enable: z.boolean(),
  description: z.string().trim().max(255, '角色说明最多 255 个字符').optional(),
  remark: z.string().trim().max(255, '备注最多 255 个字符').optional(),
  permissionIds: z.array(z.string()).default([]),
});

export type RoleFormValues = z.input<typeof roleFormSchema>;

export const getRoleRules = createZodFormRules(roleFormSchema);
