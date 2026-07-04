import ArticleForm from '../../form';

export default async function Page({ params }: IAppPages.ArticleDetailPageProps) {
  const { id } = await params;

  return <ArticleForm mode="edit" articleId={id} />;
}
