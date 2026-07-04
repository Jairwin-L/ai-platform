'use client';

import dynamic from 'next/dynamic';

const MarkdownEditor = dynamic(
  () => import('@/components/markdown-editor').then((mod) => mod.MarkdownEditor),
  {
    ssr: false,
    loading: () => (
      <div className="simple-editor-loading">
        <div>Loading editor...</div>
      </div>
    ),
  },
);

export function DynamicMarkdownEditor(props: IEditorComponent.MarkdownEditorProps) {
  return <MarkdownEditor {...props} />;
}
