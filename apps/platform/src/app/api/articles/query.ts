import type { Article as PrismaArticle, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export interface ArticleQueryParams {
  cursor?: string | null;
  limit: number;
  keyword?: string;
}

export interface ArticleQueryResult {
  data: PrismaArticle[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
}

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
