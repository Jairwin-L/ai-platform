declare namespace IArticleSchema {
  type CreateArticleInput = import('zod').infer<
    typeof import('@/lib/article-schema').createArticleSchema
  >;

  type UpdateArticleInput = import('zod').infer<
    typeof import('@/lib/article-schema').updateArticleSchema
  >;
}

