import ArticleForm from '../../components/form';

export default async function Page({ params }: IAppPages.ArticleDetailPageProps) {
  const { id } = await params;

  return <ArticleForm mode="edit" articleId={id} />;
}
