'use client';

import dynamic from 'next/dynamic';

const SimpleEditor = dynamic(() => import('@/components/editor').then((mod) => mod.SimpleEditor), {
  ssr: false,
  loading: () => (
    <div className="simple-editor-loading">
      <div>Loading editor...</div>
    </div>
  ),
});

export function DynamicSimpleEditor(props: IEditorComponent.SimpleEditorProps) {
  return <SimpleEditor {...props} />;
}
