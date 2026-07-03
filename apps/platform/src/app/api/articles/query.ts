import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';

export type ArticleQueryParams = IArticleQuery.ArticleQueryParams;
export type ArticleQueryResult = IArticleQuery.ArticleQueryResult;

function getArticleWhere(keyword: string): Prisma.ArticleWhereInput {
  if (!keyword) {
    return {};
  }

  return {
    OR: [
      { title: { contains: keyword, mode: 'insensitive' } },
      { slug: { contains: keyword, mode: 'insensitive' } },
      { summary: { contains: keyword, mode: 'insensitive' } },
    ],
  };
}

export async function queryArticles(params: ArticleQueryParams): Promise<ArticleQueryResult> {
  const where = getArticleWhere(params.keyword ?? '');
  const { cursor, limit } = params;
  const articles = await prisma.article.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    take: limit + 1,
  });
  const hasMore = articles.length > limit;
  const data = hasMore ? articles.slice(0, limit) : articles;

  return {
    data,
    pagination: {
      nextCursor: hasMore ? (data.at(-1)?.id ?? null) : null,
      hasMore,
      limit,
    },
  };
}
