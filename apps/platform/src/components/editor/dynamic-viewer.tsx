'use client';

import dynamic from 'next/dynamic';

const SimpleEditorViewer = dynamic(
  () => import('@/components/editor/viewer').then((mod) => mod.SimpleEditorViewer),
  {
    ssr: false,
    loading: () => (
      <div className="simple-editor-loading">
        <div>Loading editor...</div>
      </div>
    ),
  },
);

interface DynamicSimpleEditorViewerProps {
  content: string;
}

export function DynamicSimpleEditorViewer({ content }: DynamicSimpleEditorViewerProps) {
  return <SimpleEditorViewer content={content} />;
}
