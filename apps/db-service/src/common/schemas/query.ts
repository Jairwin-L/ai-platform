/**
 * 查询参数的公共 zod schema。
 *
 * 约定：分页、搜索这类查询参数不因为值非法而返回 400，一律静默回落到默认值——
 * 与迁移前 getPositiveInteger 等手写解析的行为一致，带脏参数的旧链接不会突然变成错误页。
 */
import { z } from 'zod';

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 1000;

/**
 * 取查询参数的单个字符串值：同名参数重复出现时 Express 给的是数组，取第一项；
 * 非字符串（`?a[b]=c` 解析出的嵌套对象等）一律按未传处理。
 */
export function firstQueryValue(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

/** 页码：非正整数一律回落到第 1 页 */
export const pageQuery = z.preprocess(
  firstQueryValue,
  z.coerce.number().int().positive().default(1).catch(1),
);

/**
 * 每页条数：非法值回落默认值；超过上限截断到上限。
 * 上限放到 1000：权限树、角色下拉会一次拉全量，迁移前的管理页就是这么请求的。
 */
export function pageSizeQuery(defaultSize = DEFAULT_PAGE_SIZE, maxSize = MAX_PAGE_SIZE) {
  return z.preprocess(
    firstQueryValue,
    z.coerce
      .number()
      .int()
      .min(1)
      .default(defaultSize)
      .catch(defaultSize)
      .transform((size) => Math.min(size, maxSize)),
  );
}

/** 搜索关键字：去空白，空串按未传处理 */
export const searchTermQuery = z.preprocess(
  firstQueryValue,
  z.string().trim().min(1).optional().catch(undefined),
);

/** 可选布尔：只认 true / false 两个字面量，其余按未传处理 */
export const optionalBooleanQuery = z.preprocess(
  firstQueryValue,
  z
    .enum(['true', 'false'])
    .optional()
    .catch(undefined)
    .transform((value) => (value === undefined ? undefined : value === 'true')),
);

/** 分页字段，展开进各模块自己的查询 schema（展开而不是 and：交叉类型生成不出查询参数文档） */
export const paginationShape = { page: pageQuery, pageSize: pageSizeQuery() };

/** 给分页查询补上 Prisma 的 skip / take */
export function withPaginationRange<T extends { page: number; pageSize: number }>(value: T) {
  return { ...value, skip: (value.page - 1) * value.pageSize, take: value.pageSize };
}
