import ArticleForm from '../../form';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  return <ArticleForm mode="edit" articleId={id} />;
}
