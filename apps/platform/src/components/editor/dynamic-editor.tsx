'use client';

import dynamic from 'next/dynamic';
import LoadingEditorPreview from '../loading/editor';

const SimpleEditor = dynamic(() => import('@/components/editor').then((mod) => mod.SimpleEditor), {
  ssr: false,
  loading: () => <LoadingEditorPreview />,
});

export function DynamicSimpleEditor(props: IEditorComponent.SimpleEditorProps) {
  return <SimpleEditor {...props} />;
}
