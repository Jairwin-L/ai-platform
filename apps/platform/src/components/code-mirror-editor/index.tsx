'use client';

import * as React from 'react';
import { markdown } from '@codemirror/lang-markdown';
import { basicSetup, EditorView } from 'codemirror';
import { CODE_MIRROR_CONTENT_EXAMPLE } from '@/constants/editor';
import styles from './index.module.scss';

function getDarkModePreference() {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    document.documentElement.classList.contains('dark') ||
    document.body.classList.contains('dark') ||
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

function createEditorTheme(isDarkMode: boolean) {
  return EditorView.theme(
    {
      '&': {
        backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
        color: isDarkMode ? '#e5e7eb' : '#2f3337',
      },
      '.cm-content': {
        caretColor: isDarkMode ? '#93c5fd' : '#000000',
        minHeight: '100%',
        padding: '1.25rem 0',
      },
      '.cm-line': {
        padding: '0 1.25rem',
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: isDarkMode ? '#93c5fd' : '#000000',
      },
      '.cm-activeLine': {
        backgroundColor: isDarkMode ? 'rgba(148, 163, 184, 0.12)' : '#fafafa',
      },
      '.cm-activeLineGutter': {
        backgroundColor: isDarkMode ? 'rgba(148, 163, 184, 0.14)' : '#f5f5f5',
      },
      '.cm-gutters': {
        backgroundColor: isDarkMode ? '#111827' : '#f7f7f7',
        borderRightColor: isDarkMode ? 'rgba(255, 255, 255, 0.14)' : '#ededed',
        color: isDarkMode ? 'rgba(229, 231, 235, 0.55)' : '#8f8f8f',
      },
      '.cm-lineNumbers .cm-gutterElement': {
        minWidth: '2.375rem',
        padding: '0 0.875rem 0 0',
      },
      '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
        backgroundColor: isDarkMode ? 'rgba(96, 165, 250, 0.35)' : 'rgba(0, 112, 243, 0.18)',
      },
      '.tok-heading': {
        color: isDarkMode ? '#f8fafc' : '#24292f',
        fontWeight: '700',
      },
      '.tok-link, .tok-url': {
        color: isDarkMode ? '#93c5fd' : '#1f6feb',
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
    { dark: isDarkMode },
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
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  const lineCount = React.useMemo(() => content.split('\n').length, [content]);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateDarkModePreference = () => {
      setIsDarkMode(getDarkModePreference());
    };
    const updateDarkMode = (event: MediaQueryListEvent) => {
      setIsDarkMode(
        document.documentElement.classList.contains('dark') ||
          document.body.classList.contains('dark') ||
          event.matches,
      );
    };
    const observer = new MutationObserver(updateDarkModePreference);

    updateDarkModePreference();
    mediaQuery.addEventListener('change', updateDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => {
      mediaQuery.removeEventListener('change', updateDarkMode);
      observer.disconnect();
    };
  }, []);

  React.useEffect(() => {
    if (!editorHostRef.current) return;

    const view = new EditorView({
      doc: contentRef.current,
      extensions: [
        basicSetup,
        markdown(),
        createEditorTheme(isDarkMode),
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
  }, [isDarkMode, onChange]);

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
        <span>{isDarkMode ? 'Dark' : 'Light'} mode</span>
        <span className={styles.metrics}>
          <span>{lineCount} lines</span>
          <span>{content.length} chars</span>
        </span>
      </div>
    </div>
  );
}
