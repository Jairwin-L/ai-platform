import { z } from 'zod';
import { PermissionType } from '@/generated/prisma/client';
import {
  firstQueryValue,
  optionalBooleanQuery,
  pageQuery,
  pageSizeQuery,
  searchTermQuery,
  withPaginationRange,
} from '@/common/schemas/query';
import { positiveIntParam } from '@/common/schemas/params';

/** 权限编码：大写字母开头，冒号分层，如 `ARTICLES:VIEW`、`AI:SETTINGS:MANAGE` */
const PERMISSION_CODE_PATTERN = /^[A-Z][A-Z0-9_]*(?::[A-Z0-9_]+)*$/;

/** 权限列表：tree=true 时返回整棵树且不分页；type 传 all 或非法值按不过滤处理 */
export const listPermissionsQuery = z
  .object({
    page: pageQuery,
    pageSize: pageSizeQuery(),
    searchTerm: searchTermQuery,
    tree: optionalBooleanQuery.transform((value) => value === true),
    type: z.preprocess(firstQueryValue, z.enum(PermissionType).optional().catch(undefined)),
  })
  .transform(withPaginationRange);

const parentIdSchema = z
  .union([z.coerce.number().int().positive('上级权限 ID 无效'), z.null()])
  .optional();

const descriptionSchema = z
  .string()
  .trim()
  .max(240, '说明最多 240 个字符')
  .nullable()
  .optional()
  .transform((value) => (value === undefined ? undefined : value || null));

/**
 * 新建权限。迁移前这里直接把请求体原样交给 prisma.create，任意字段都能写进去；
 * 现在只收白名单字段。
 */
export const createPermissionSchema = z.object({
  name: z.string('请输入权限名称').trim().min(1, '请输入权限名称').max(80),
  code: z
    .string('请输入权限编码')
    .trim()
    .toUpperCase()
    .regex(PERMISSION_CODE_PATTERN, '权限编码格式不正确，例如 ARTICLES:VIEW')
    .max(120),
  type: z.enum(PermissionType, '权限类型无效'),
  description: descriptionSchema,
  parent_id: parentIdSchema,
});

export const updatePermissionSchema = createPermissionSchema.partial();

export const permissionIdParam = positiveIntParam('URL 中缺少权限 ID');

export type ListPermissionsQuery = z.infer<typeof listPermissionsQuery>;
export type CreatePermissionInput = z.infer<typeof createPermissionSchema>;
export type UpdatePermissionInput = z.infer<typeof updatePermissionSchema>;
