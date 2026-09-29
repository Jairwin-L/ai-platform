import { z } from 'zod';
import { requiredIdParam } from '@/common/schemas/params';
import {
  optionalBooleanQuery,
  paginationShape,
  requiredQueryText,
  searchTermQuery,
  withPaginationRange,
} from '@/common/schemas/query';

/** 角色编码：大写常量格式，与权限码同一规则 */
const ROLE_CODE = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;

/** id 数组：元素必须是非空字符串，重复项去掉 */
const idList = z.array(z.string().trim().min(1)).transform((ids) => Array.from(new Set(ids)));

/** 可选说明文字：空串归一化为 null */
const optionalText = z
  .string()
  .trim()
  .max(255, '最多 255 个字符')
  .optional()
  .transform((value) => (value === undefined ? undefined : value || null));

/** 角色分页列表 */
export const pageQueryRolesQuery = z
  .object({
    ...paginationShape,
    searchTerm: searchTermQuery,
    enable: optionalBooleanQuery,
  })
  .transform(withPaginationRange);

/** 角色下拉列表：只按启停状态过滤 */
export const queryRolesQuery = z.object({ enable: optionalBooleanQuery });

/** 只带一个角色 id 的查询（查角色下的用户、删除角色） */
export const roleIdQuery = z.object({ id: requiredQueryText('角色 id 不能为空') });

/**
 * 新建角色。
 *
 * name 统一转小写落库：查重按原值比对，入口不归一化就会出现「Admin 和 admin 是两个角色」。
 */
export const createRoleSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, '请输入角色名称')
      .max(50, '角色名称最多 50 个字符')
      .transform((name) => name.toLowerCase()),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(ROLE_CODE, '角色编码使用大写常量格式，如 CONTENT_REVIEWER')
      .max(50, '角色编码最多 50 个字符'),
    enable: z.boolean().default(true),
    description: optionalText,
    remark: optionalText,
    permissionIds: idList.default([]),
  })
  .strict();

/** 编辑角色：除 id 外全部可选，未传的字段不动 */
export const updateRoleSchema = z
  .object({
    id: requiredIdParam('角色 id 不能为空'),
    name: z
      .string()
      .trim()
      .min(1, '角色名称不能为空')
      .max(50, '角色名称最多 50 个字符')
      .transform((name) => name.toLowerCase())
      .optional(),
    code: z.string().trim().toUpperCase().optional(),
    enable: z.boolean().optional(),
    description: optionalText,
    remark: optionalText,
    permissionIds: idList.optional(),
  })
  .strict();

/** 批量设置角色下的用户 */
export const setRoleUserSchema = z
  .object({
    roleId: requiredIdParam('roleId 不能为空'),
    userIds: idList,
  })
  .strict();

export type PageQueryRolesQuery = z.infer<typeof pageQueryRolesQuery>;
export type QueryRolesQuery = z.infer<typeof queryRolesQuery>;
export type RoleIdQuery = z.infer<typeof roleIdQuery>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type SetRoleUserInput = z.infer<typeof setRoleUserSchema>;
