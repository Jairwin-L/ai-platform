'use client';

import * as React from 'react';
import { markdown } from '@codemirror/lang-markdown';
import { basicSetup, EditorView } from 'codemirror';
import { CODE_MIRROR_CONTENT_EXAMPLE } from '@/constants/editor';
import styles from './index.module.scss';

function createEditorTheme() {
  return EditorView.theme(
    {
      '&': {
        backgroundColor: '#ffffff',
        color: '#2f3337',
      },
      '.cm-content': {
        caretColor: '#000000',
        minHeight: '100%',
        padding: '1.25rem 0',
      },
      '.cm-line': {
        padding: '0 1.25rem',
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: '#000000',
      },
      '.cm-activeLine': {
        backgroundColor: '#fafafa',
      },
      '.cm-activeLineGutter': {
        backgroundColor: '#f5f5f5',
      },
      '.cm-gutters': {
        backgroundColor: '#f7f7f7',
        borderRightColor: '#ededed',
        color: '#8f8f8f',
      },
      '.cm-lineNumbers .cm-gutterElement': {
        minWidth: '2.375rem',
        padding: '0 0.875rem 0 0',
      },
      '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
        backgroundColor: 'rgba(0, 112, 243, 0.18)',
      },
      '.tok-heading': {
        color: '#24292f',
        fontWeight: '700',
      },
      '.tok-link, .tok-url': {
        color: '#1f6feb',
      },
      '.tok-emphasis': {
        fontStyle: 'italic',
      },
      '.tok-strong': {
        fontWeight: '700',
      },
      '&.cm-focused': {
        outline: 'none',
      },
    },
    { dark: false },
  );
}

interface CodeMirrorEditorProps {
  value?: string;
  onChange?: (value: string) => void;
}

export function CodeMirrorEditor({
  value = CODE_MIRROR_CONTENT_EXAMPLE,
  onChange,
}: CodeMirrorEditorProps) {
  const editorHostRef = React.useRef<HTMLDivElement>(null);
  const editorViewRef = React.useRef<EditorView | null>(null);
  const contentRef = React.useRef(value);
  const [content, setContent] = React.useState(value);

  const lineCount = React.useMemo(() => content.split('\n').length, [content]);

  React.useEffect(() => {
    if (!editorHostRef.current) return;

    const view = new EditorView({
      doc: contentRef.current,
      extensions: [
        basicSetup,
        markdown(),
        createEditorTheme(),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return;

          const nextContent = update.state.doc.toString();
          contentRef.current = nextContent;
          setContent(nextContent);
          onChange?.(nextContent);
        }),
      ],
      parent: editorHostRef.current,
    });

    editorViewRef.current = view;

    return () => {
      view.destroy();
      editorViewRef.current = null;
    };
  }, [onChange]);

  React.useEffect(() => {
    const view = editorViewRef.current;
    if (!view) return;

    const currentContent = view.state.doc.toString();
    if (value === currentContent) return;

    contentRef.current = value;
    setContent(value);
    view.dispatch({
      changes: {
        from: 0,
        to: currentContent.length,
        insert: value,
      },
    });
  }, [value]);

  return (
    <div className={styles.editor}>
      <div className={styles['editor-host']} ref={editorHostRef} />
      <div className={styles.status}>
        <span className={styles.metrics}>
          <span>{lineCount} lines</span>
          <span>{content.length} chars</span>
        </span>
      </div>
    </div>
  );
}
