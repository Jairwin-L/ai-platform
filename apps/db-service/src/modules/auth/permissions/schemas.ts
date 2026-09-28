import { z } from 'zod';
import { PermissionType } from '@/generated/prisma/client';
import { requiredIdParam } from '@/common/schemas/params';
import {
  firstQueryValue,
  optionalBooleanQuery,
  paginationShape,
  searchTermQuery,
  withPaginationRange,
} from '@/common/schemas/query';

/** 权限码：大写常量格式，大写字母开头，单词之间用单个 `_` 连接，如 `USER_RESET_PASSWORD` */
const PERMISSION_CODE = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;

/** 新建时的可空字符串：取 trim 结果，缺省或 null 落成 null */
const nullableText = (max: number) => z.string().trim().max(max).nullable().default(null);

/** 同上，但空串也归一化为 null（path / icon 这类字段空串没有意义） */
const nullableTextOrNull = (max: number) => nullableText(max).transform((value) => value || null);

/** 编辑时的可空字符串：缺省保持 undefined（不更新该字段），空串归一化为 null */
const optionalNullableTextOrNull = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((value) => (value === undefined ? undefined : value || null));

/** 排序值：非负整数，非法值直接 400 */
const optionalSort = z.coerce.number().int().min(0, '权限排序值无效').optional();

/** 权限列表：tree=true 时返回整棵树且不分页 */
export const listPermissionsQuery = z
  .object({
    ...paginationShape,
    searchTerm: searchTermQuery,
    tree: optionalBooleanQuery.transform((value) => value === true),
    type: z.preprocess(firstQueryValue, z.enum(PermissionType).optional().catch(undefined)),
  })
  .transform(withPaginationRange);

/** 新建权限（菜单 / 按钮资源） */
export const createPermissionSchema = z
  .object({
    code: z.string().trim().regex(PERMISSION_CODE, '权限编码格式不正确').max(100),
    name: z.string().trim().min(1, '请输入权限名称').max(100),
    type: z.enum(PermissionType, '权限类型无效'),
    description: nullableText(255),
    path: nullableTextOrNull(255),
    icon: nullableTextOrNull(100),
    isShow: z.boolean().default(true),
    enable: z.boolean().default(true),
    keepAlive: z.boolean().default(false),
    sort: optionalSort.transform((value) => value ?? 0),
    parentId: nullableTextOrNull(100),
  })
  .strict();

/** 编辑权限：全部可选，未传的字段不更新 */
export const updatePermissionSchema = z
  .object({
    code: z.string().trim().regex(PERMISSION_CODE, '权限编码格式不正确').max(100).optional(),
    name: z.string().trim().min(1, '权限名称不能为空').max(100).optional(),
    type: z.enum(PermissionType, '权限类型无效').optional(),
    description: optionalNullableTextOrNull(255),
    path: optionalNullableTextOrNull(255),
    icon: optionalNullableTextOrNull(100),
    isShow: z.boolean().optional(),
    enable: z.boolean().optional(),
    keepAlive: z.boolean().optional(),
    sort: optionalSort,
    parentId: optionalNullableTextOrNull(100),
  })
  .strict();

export const permissionIdParam = requiredIdParam('权限 id 不能为空');

export type ListPermissionsQuery = z.infer<typeof listPermissionsQuery>;
export type CreatePermissionInput = z.infer<typeof createPermissionSchema>;
export type UpdatePermissionInput = z.infer<typeof updatePermissionSchema>;
