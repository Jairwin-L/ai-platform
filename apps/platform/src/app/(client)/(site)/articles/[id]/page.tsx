import { notFound } from 'next/navigation';
import { fetchArticleById } from '../utils/article';
import ArticleDetail from './article-detail';

export default async function Page({ params }: IAppPages.ArticleDetailPageProps) {
  const { id } = await params;
  const article = await fetchArticleById(id);

  if (!article) {
    notFound();
  }

  return <ArticleDetail article={article} />;
}
