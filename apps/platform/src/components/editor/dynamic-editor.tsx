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

interface DynamicSimpleEditorProps {
  content?: string;
  value?: string;
  onUpdate?: (html: string) => void;
  onChange?: (html: string) => void;
}

export function DynamicSimpleEditor(props: DynamicSimpleEditorProps) {
  return <SimpleEditor {...props} />;
}
