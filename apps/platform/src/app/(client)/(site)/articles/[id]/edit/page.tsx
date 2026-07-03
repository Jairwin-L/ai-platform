import ArticleForm from '../../form';

type PageProps = IAppPages.ArticleDetailPageProps;

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  return <ArticleForm mode="edit" articleId={id} />;
}
