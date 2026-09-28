import { z } from 'zod';
import { RoleStatus } from '@/generated/prisma/client';
import { SYSTEM_ROLE_CODES } from '@ai/constants/roles';
import {
  pageQuery,
  pageSizeQuery,
  searchTermQuery,
  withPaginationRange,
} from '@/common/schemas/query';
import { positiveIntParam } from '@/common/schemas/params';

export const listRolesQuery = z
  .object({
    page: pageQuery,
    pageSize: pageSizeQuery(),
    searchTerm: searchTermQuery,
  })
  .transform(withPaginationRange);

/** 角色编码统一大写，且必须是系统定义的角色编码之一（迁移前的既有约束） */
const roleCodeSchema = z
  .string('角色编码不能为空')
  .trim()
  .toUpperCase()
  .min(1, '角色编码不能为空')
  .refine((code) => (SYSTEM_ROLE_CODES as string[]).includes(code), '角色编码不在系统定义范围内');

/** 权限 id：前端以字符串传入，去重后按整数落库 */
const permissionIdsSchema = z
  .array(z.coerce.number().int().positive('权限 ID 无效'))
  .transform((ids) => Array.from(new Set(ids)));

const descriptionSchema = z
  .string()
  .trim()
  .max(240, '角色说明最多 240 个字符')
  .nullable()
  .optional()
  .transform((value) => (value === undefined ? undefined : value || null));

export const createRoleSchema = z.object({
  code: roleCodeSchema,
  name: z.string('角色名称不能为空').trim().min(1, '角色名称不能为空').max(80),
  description: descriptionSchema,
  is_system: z.boolean().optional(),
  status: z.enum(RoleStatus, '角色状态无效').optional(),
  permissions: permissionIdsSchema.optional(),
});

export const updateRoleSchema = createRoleSchema.partial();

export const roleIdParam = positiveIntParam('URL 中缺少角色 ID');

export type ListRolesQuery = z.infer<typeof listRolesQuery>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
