'use client';

import dynamic from 'next/dynamic';
import LoadingEditorPreview from '../loading/editor';

const MarkdownEditorViewer = dynamic(
  () => import('@/components/markdown-editor/viewer').then((mod) => mod.MarkdownEditorViewer),
  {
    ssr: false,
    loading: () => <LoadingEditorPreview />,
  },
);

export function DynamicMarkdownEditorViewer({
  content,
  renderImagesWithAntd,
}: IEditorComponent.DynamicMarkdownEditorViewerProps) {
  return <MarkdownEditorViewer content={content} renderImagesWithAntd={renderImagesWithAntd} />;
}
