import type { Article as PrismaArticle, Prisma } from '@prisma/client';
import { getPrisma } from '@/lib/prisma';

export interface ArticleQueryParams {
  page: number;
  pageSize: number;
  keyword?: string;
}

export interface ArticleQueryResult {
  data: PrismaArticle[];
  total: number;
  page: number;
  pageSize: number;
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

function throwIfRejected<T>(result: PromiseSettledResult<T>): T {
  if (result.status === 'rejected') {
    throw result.reason;
  }

  return result.value;
}

export async function queryArticles(params: ArticleQueryParams): Promise<ArticleQueryResult> {
  const prisma = getPrisma();
  const where = getArticleWhere(params.keyword ?? '');
  const [articlesResult, totalResult] = await Promise.allSettled([
    prisma.article.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.article.count({ where }),
  ]);
  const articles = throwIfRejected(articlesResult);
  const total = throwIfRejected(totalResult);

  return {
    data: articles,
    total,
    page: params.page,
    pageSize: params.pageSize,
  };
}
