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

export function DynamicSimpleEditorViewer({
  content,
}: IEditorComponent.DynamicSimpleEditorViewerProps) {
  return <SimpleEditorViewer content={content} />;
}
