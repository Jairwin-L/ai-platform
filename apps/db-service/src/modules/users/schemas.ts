import { z } from 'zod';
import { UserStatusType } from '@/generated/prisma/client';
import {
  firstQueryValue,
  pageQuery,
  pageSizeQuery,
  searchTermQuery,
  withPaginationRange,
} from '@/common/schemas/query';
import { requiredIdParam } from '@/common/schemas/params';

/** 用户列表：单页最多 100 条，与迁移前一致 */
export const listUsersQuery = z
  .object({
    page: pageQuery,
    pageSize: pageSizeQuery(10, 100),
    searchTerm: searchTermQuery,
    /** 按角色编码过滤 */
    role: searchTermQuery,
    /** 非枚举值（含 all）按未传处理 */
    status: z.preprocess(firstQueryValue, z.enum(UserStatusType).optional().catch(undefined)),
  })
  .transform(withPaginationRange);

/** 可空文本：字符串取 trim 结果、空串归一化为 null；未传保持 undefined（不更新该字段） */
function optionalNullableText(maxLength: number, message: string) {
  return z
    .string(message)
    .trim()
    .max(maxLength, message)
    .nullable()
    .optional()
    .transform((value) => (value === undefined ? undefined : value || null));
}

/** 管理员编辑用户：资料、状态与角色 */
export const adminUpdateUserSchema = z
  .object({
    full_name: optionalNullableText(120, '姓名最多 120 个字符'),
    nick_name: optionalNullableText(120, '昵称最多 120 个字符'),
    user_name: optionalNullableText(120, '用户名最多 120 个字符'),
    bio: optionalNullableText(500, '简介最多 500 个字符'),
    status: z.enum(UserStatusType, '用户状态无效').optional(),
    roleIds: z
      .array(z.coerce.number().int().positive('roleIds 必须包含正整数'))
      .optional()
      .transform((ids) => (ids ? Array.from(new Set(ids)) : undefined)),
  })
  .strict();

/** 用户在前台编辑自己的资料：只开放昵称与简介 */
export const platformUpdateUserSchema = z
  .object({
    nick_name: optionalNullableText(120, '昵称最多 120 个字符'),
    bio: optionalNullableText(500, '简介最多 500 个字符'),
  })
  .strict();

export const userIdParam = requiredIdParam('用户 ID 不能为空');

export type ListUsersQuery = z.infer<typeof listUsersQuery>;
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
export type PlatformUpdateUserInput = z.infer<typeof platformUpdateUserSchema>;
