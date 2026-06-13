import { z } from 'zod';

const optionalSummarySchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
  z.string().trim().max(240, '摘要最多 240 个字符').nullable().optional(),
);

export const articleQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  keyword: z.string().trim().max(80).optional().default(''),
});

export const createArticleSchema = z.object({
  title: z.string().trim().min(1, '标题不能为空').max(120, '标题最多 120 个字符'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Slug 不能为空')
    .max(160, 'Slug 最多 160 个字符')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug 只能包含小写字母、数字和连字符'),
  summary: optionalSummarySchema,
  content: z.string().trim().min(1, '内容不能为空'),
  published: z.boolean().optional().default(false),
});

export const updateArticleSchema = createArticleSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  {
    message: '至少需要提交一个字段',
  },
);

export type CreateArticleInput = z.infer<typeof createArticleSchema>;
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;
