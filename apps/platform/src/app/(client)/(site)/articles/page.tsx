import { articleQuerySchema } from '@/lib/article-schema';
import ArticlesClient from './articles';
import { fetchArticleList } from './utils/article';

function getSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Page({ searchParams }: IAppPages.ArticleListPageProps) {
  const params = await searchParams;
  const query = articleQuerySchema.parse({
    cursor: getSearchValue(params.cursor),
    limit: getSearchValue(params.limit),
    keyword: getSearchValue(params.keyword),
  });
  const { cursor, limit, keyword } = query;

  const initialData = await fetchArticleList({ cursor, limit, keyword });

  return <ArticlesClient initialData={initialData} initialKeyword={keyword} />;
}
