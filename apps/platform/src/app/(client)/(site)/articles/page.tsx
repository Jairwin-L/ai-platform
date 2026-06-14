import { articleQuerySchema } from '@/lib/article-schema';
import ArticlesClient from './articles-client';
import { fetchArticleList } from './utils/article';

export const dynamic = 'force-dynamic';

interface ArticlesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Page({ searchParams }: ArticlesPageProps) {
  const params = await searchParams;
  const query = articleQuerySchema.parse({
    page: getSearchValue(params.page),
    pageSize: getSearchValue(params.pageSize),
    keyword: getSearchValue(params.keyword),
  });
  const { page, pageSize, keyword } = query;

  const initialData = await fetchArticleList({ page, pageSize, keyword });

  return <ArticlesClient initialData={initialData} initialKeyword={keyword} />;
}
