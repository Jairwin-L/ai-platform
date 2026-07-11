import { notFound } from 'next/navigation';
import { EDITOR_ITEMS, isEditorType } from '@/constants/editor';
import { EditorPage } from './editor-page';

interface PageProps {
  params: Promise<{
    type: string;
  }>;
}

export function generateStaticParams() {
  return EDITOR_ITEMS.map((item) => ({
    type: item.type,
  }));
}

export default async function Page({ params }: PageProps) {
  const { type } = await params;

  if (!isEditorType(type)) {
    notFound();
  }

  return <EditorPage type={type} />;
}
