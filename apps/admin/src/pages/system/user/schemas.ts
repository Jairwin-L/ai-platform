/**
 * 系统用户相关表单校验 schema：新增、编辑、重置密码，规则与 db-service 的 users/schemas.ts 保持一致。
 */
import { z } from 'zod';

/** 账号是后台登录凭据，只允许常见的账号字符 */
const ACCOUNT_PATTERN = /^[a-zA-Z0-9_.@-]+$/;

function password(requiredMessage: string) {
  return z
    .string(requiredMessage)
    .min(1, requiredMessage)
    .min(8, '密码至少 8 位')
    .max(128, '密码最多 128 位');
}

const username = z
  .string('请输入用户名')
  .trim()
  .min(1, '请输入用户名')
  .max(100, '用户名不能超过 100 个字符');

const remark = z.string().trim().max(255, '备注不能超过 255 个字符').optional();

export const createUserFormSchema = z.object({
  username,
  account: z
    .string('请输入账号')
    .trim()
    .min(1, '请输入账号')
    .max(100, '账号不能超过 100 个字符')
    .regex(ACCOUNT_PATTERN, '账号只能包含字母、数字、下划线、点、@ 和连字符'),
  password: password('请输入初始密码'),
  roleIds: z.array(z.string(), '请选择角色').min(1, '请至少选择一个角色'),
  remark,
  enabled: z.boolean(),
});

export const editUserFormSchema = z.object({
  username,
  roleIds: z.array(z.string()),
  remark,
  enabled: z.boolean(),
});

export const resetPasswordFormSchema = z
  .object({
    password: password('请输入新密码'),
    confirmPassword: z.string('请再次输入新密码').min(1, '请再次输入新密码'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: '两次输入的密码不一致',
  });

export type CreateUserFormValues = z.input<typeof createUserFormSchema>;
export type EditUserFormValues = z.input<typeof editUserFormSchema>;
export type ResetPasswordFormValues = z.input<typeof resetPasswordFormSchema>;
