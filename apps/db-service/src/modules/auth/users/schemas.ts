import { z } from 'zod';
import { UserStatusType } from '@/generated/prisma/client';
import {
  firstQueryValue,
  paginationShape,
  searchTermQuery,
  withPaginationRange,
} from '@/common/schemas/query';

/**
 * 系统用户密码：至少 6 位，与 prisma:bootstrap-admin 的规则一致；
 * 平台用户注册的 8 位规则见 ../schemas.ts 的 passwordSchema，两者互不影响。
 * 上限挡住超长输入：scrypt 对超长串的开销可被用作 DoS 手段。
 */
const systemUserPasswordSchema = z.string().min(6, '密码至少 6 位').max(128, '密码最多 128 位');

/** 账号是后台登录凭据，只允许常见的账号字符 */
const ACCOUNT_PATTERN = /^[a-zA-Z0-9_.@-]+$/;

const accountSchema = z
  .string()
  .trim()
  .min(1, '请输入账号')
  .max(100, '账号不能超过 100 个字符')
  .regex(ACCOUNT_PATTERN, '账号只能包含字母、数字、下划线、点、@ 和连字符');

/** 可选文本：留空（含 null）归一化为 null */
function optionalNullableText(maxLength: number, message: string) {
  return z
    .string()
    .trim()
    .max(maxLength, message)
    .nullish()
    .transform((value) => value || null);
}

/** 编辑时的可选文本：未传保持 undefined（不更新该字段），留空（含 null）归一化为 null */
function patchNullableText(maxLength: number, message: string) {
  return z
    .string()
    .trim()
    .max(maxLength, message)
    .nullish()
    .transform((value) => (value === undefined ? undefined : value || null));
}

/** 系统用户列表：按关键字、角色过滤 */
export const listUsersQuery = z
  .object({
    ...paginationShape,
    searchTerm: searchTermQuery,
    roleId: searchTermQuery,
  })
  .transform(withPaginationRange);

/**
 * 新建系统用户。
 *
 * roleIds 必填且去重：空数组会让新用户没有任何角色，等于建了个登不进后台的账号。
 * 系统用户只按 account 登录管理端，所以 account 必填，且没有邮箱字段。
 */
export const createUserSchema = z
  .object({
    password: systemUserPasswordSchema,
    account: accountSchema,
    username: z.string().trim().min(1, '请输入用户名').max(100, '用户名不能超过 100 个字符'),
    nickname: optionalNullableText(100, '昵称不能超过 100 个字符'),
    avatar: optionalNullableText(2000, '头像地址过长'),
    remark: optionalNullableText(255, '备注不能超过 255 个字符'),
    status: z.enum(UserStatusType, '用户状态无效').default('active'),
    roleIds: z
      .array(z.string().trim().min(1))
      .min(1, '请至少选择一个角色')
      .transform((roleIds) => Array.from(new Set(roleIds))),
  })
  .strict();

/**
 * 后台编辑系统用户：所有字段可选。
 * 带 password 时只重置密码，不与资料字段混着更新（见 UsersService.update）。
 */
export const updateUserSchema = z
  .object({
    // account 是登录凭据且非空：空串按没传处理，不能把账号清空
    account: accountSchema.optional(),
    username: patchNullableText(100, '用户名不能超过 100 个字符'),
    nickname: patchNullableText(100, '昵称不能超过 100 个字符'),
    avatar: patchNullableText(2000, '头像地址过长'),
    remark: patchNullableText(255, '备注不能超过 255 个字符'),
    status: z.enum(UserStatusType, '用户状态无效').optional(),
    password: systemUserPasswordSchema.optional(),
  })
  .strict();

/**
 * 批量删除系统用户。
 *
 * 上限 100 与列表单页上限一致：批量删除只来自表格勾选，超出说明请求不是后台页面发的。
 */
export const removeUsersSchema = z
  .object({
    ids: z
      .array(z.string().trim().min(1))
      .min(1, 'ids 不能为空')
      .max(100, '单次最多删除 100 个用户')
      .transform((ids) => Array.from(new Set(ids))),
  })
  .strict();

/** 平台注册用户列表：没有角色维度，非枚举值按未传处理 */
export const listPlatformUsersQuery = z
  .object({
    ...paginationShape,
    searchTerm: searchTermQuery,
    status: z.preprocess(firstQueryValue, z.enum(UserStatusType).optional().catch(undefined)),
  })
  .transform(withPaginationRange);

/** 平台用户只有正常、受限、已封禁、已停用四种状态 */
const PLATFORM_USER_MANAGEABLE_STATUSES = ['active', 'restricted', 'banned', 'inactive'] as const;

/**
 * 修改平台注册用户状态。
 *
 * - 受限、封禁必须填写原因（会展示给用户本人），可选截止时间，到期自动恢复正常；
 * - 停用原因可选，不支持截止时间，只能手动恢复；
 * - 恢复正常时原因与期限由服务端清空，传了也忽略。
 */
export const updatePlatformUserStatusSchema = z
  .object({
    status: z.enum(PLATFORM_USER_MANAGEABLE_STATUSES, '平台用户状态无效'),
    reason: z
      .string()
      .trim()
      .max(255, '原因不能超过 255 个字')
      .nullish()
      .transform((value) => value || null),
    expiresAt: z.iso
      .datetime({ offset: true })
      .nullish()
      .transform((value) => (value ? new Date(value) : null)),
  })
  .strict()
  .superRefine((value, context) => {
    const isTimed = value.status === 'restricted' || value.status === 'banned';
    if (isTimed && !value.reason) {
      context.addIssue({
        code: 'custom',
        path: ['reason'],
        message: '限制或封禁用户时必须填写原因',
      });
    }
    if (value.expiresAt && !isTimed) {
      context.addIssue({
        code: 'custom',
        path: ['expiresAt'],
        message: '只有受限和封禁可以设置截止时间',
      });
    }
    if (value.expiresAt && value.expiresAt.getTime() <= Date.now()) {
      context.addIssue({
        code: 'custom',
        path: ['expiresAt'],
        message: '截止时间必须晚于当前时间',
      });
    }
  });

export type ListUsersQuery = z.infer<typeof listUsersQuery>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type RemoveUsersInput = z.infer<typeof removeUsersSchema>;
export type ListPlatformUsersQuery = z.infer<typeof listPlatformUsersQuery>;
export type UpdatePlatformUserStatusInput = z.infer<typeof updatePlatformUserStatusSchema>;
