'use client';

import dynamic from 'next/dynamic';

const MarkdownEditorViewer = dynamic(
  () => import('@/components/markdown-editor/viewer').then((mod) => mod.MarkdownEditorViewer),
  {
    ssr: false,
    loading: () => (
      <div className="simple-editor-loading">
        <div>Loading editor...</div>
      </div>
    ),
  },
);

interface DynamicMarkdownEditorViewerProps {
  content: string;
}

export function DynamicMarkdownEditorViewer({ content }: DynamicMarkdownEditorViewerProps) {
  return <MarkdownEditorViewer content={content} />;
}
