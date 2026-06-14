import { type Article, type ArticleListData } from '@/services/articles';
import { articleQuerySchema } from '@/lib/article-schema';
import { getPrisma } from '@/lib/prisma';
import ArticlesClient from './articles-client';

export const dynamic = 'force-dynamic';

interface ArticlesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function serializeArticle(article: {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}): Article {
  return {
    ...article,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
  };
}

function throwIfRejected<T>(result: PromiseSettledResult<T>) {
  if (result.status === 'rejected') {
    throw result.reason;
  }

  return result.value;
}

export default async function ArticlesPage({ searchParams }: ArticlesPageProps) {
  const params = await searchParams;
  const query = articleQuerySchema.parse({
    page: getSearchValue(params.page),
    pageSize: getSearchValue(params.pageSize),
    keyword: getSearchValue(params.keyword),
  });
  const { page, pageSize, keyword } = query;
  const where = keyword
    ? {
        OR: [
          { title: { contains: keyword, mode: 'insensitive' as const } },
          { slug: { contains: keyword, mode: 'insensitive' as const } },
          { summary: { contains: keyword, mode: 'insensitive' as const } },
        ],
      }
    : {};

  let initialData: ArticleListData = {
    data: [],
    total: 0,
    page,
    pageSize,
  };
  let initialError = '';

  try {
    const prisma = getPrisma();
    const [articlesResult, totalResult] = await Promise.allSettled([
      prisma.article.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.article.count({ where }),
    ]);

    const articles = throwIfRejected(articlesResult);
    const total = throwIfRejected(totalResult);

    initialData = {
      data: articles.map(serializeArticle),
      total,
      page,
      pageSize,
    };
  } catch (error) {
    initialError = error instanceof Error ? error.message : '文章列表加载失败';
  }

  return (
    <ArticlesClient
      initialData={initialData}
      initialKeyword={keyword}
      initialError={initialError}
    />
  );
}
