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

interface DynamicMarkdownEditorProps {
  content?: string;
  value?: string;
  onUpdate?: (markdown: string) => void;
  onChange?: (markdown: string) => void;
}

export function DynamicMarkdownEditor(props: DynamicMarkdownEditorProps) {
  return <MarkdownEditor {...props} />;
}
