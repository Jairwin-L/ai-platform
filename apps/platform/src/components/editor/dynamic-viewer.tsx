'use client';

import dynamic from 'next/dynamic';
import LoadingEditorPreview from '../loading/editor';

const SimpleEditorViewer = dynamic(
  () => import('@/components/editor/viewer').then((mod) => mod.SimpleEditorViewer),
  {
    ssr: false,
    loading: () => <LoadingEditorPreview />,
  },
);

export function DynamicSimpleEditorViewer({
  content,
}: IEditorComponent.DynamicSimpleEditorViewerProps) {
  return <SimpleEditorViewer content={content} />;
}
