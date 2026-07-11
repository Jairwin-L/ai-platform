'use client';

import dynamic from 'next/dynamic';
import LoadingEditorPreview from '../loading/editor';

const MarkdownEditor = dynamic(
  () => import('@/components/markdown-editor').then((mod) => mod.MarkdownEditor),
  {
    ssr: false,
    loading: () => <LoadingEditorPreview />,
  },
);

export function DynamicMarkdownEditor(props: IEditorComponent.MarkdownEditorProps) {
  return <MarkdownEditor {...props} />;
}
