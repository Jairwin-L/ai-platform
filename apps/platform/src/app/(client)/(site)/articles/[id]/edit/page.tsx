import ArticleForm from '../../article-form';

export const dynamic = 'force-dynamic';

interface EditArticlePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditArticlePage({ params }: EditArticlePageProps) {
  const { id } = await params;

  return <ArticleForm mode="edit" articleId={id} />;
}
