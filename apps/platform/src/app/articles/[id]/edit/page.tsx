import { notFound } from 'next/navigation';
import ArticleForm from '../../article-form';
import { getPrisma } from '@/lib/prisma';
import { type Article } from '@/services/articles';

export const dynamic = 'force-dynamic';

interface EditArticlePageProps {
  params: Promise<{
    id: string;
  }>;
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

export default async function EditArticlePage({ params }: EditArticlePageProps) {
  const { id } = await params;
  const prisma = getPrisma();
  const article = await prisma.article.findUnique({ where: { id } });

  if (!article) {
    notFound();
  }

  return <ArticleForm mode="edit" article={serializeArticle(article)} />;
}
