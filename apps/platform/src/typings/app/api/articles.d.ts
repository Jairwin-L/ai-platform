declare namespace IArticleQuery {
  interface ArticleQueryParams {
    cursor?: string | null;
    limit: number;
    keyword?: string;
  }

  interface ArticleQueryResult {
    data: Array<import('@/generated/prisma/client').Article>;
    pagination: {
      nextCursor: string | null;
      hasMore: boolean;
      limit: number;
    };
  }
}
