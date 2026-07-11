'use client';

import * as React from 'react';
import { CodeMirrorEditor } from '@/components/code-mirror-editor';
import { DynamicSimpleEditor } from '@/components/editor/dynamic-editor';
import { DynamicSimpleEditorViewer } from '@/components/editor/dynamic-viewer';
import { DynamicMarkdownEditor } from '@/components/markdown-editor/dynamic-editor';
import { DynamicMarkdownEditorViewer } from '@/components/markdown-editor/dynamic-viewer';
import type { EditorType } from '@/constants/editor';
import {
  CODE_MIRROR_CONTENT_EXAMPLE,
  MARKDOWN_CONTENT_EXAMPLE,
  RICHTEXT_CONTENT_EXAMPLE,
  getEditorItem,
} from '@/constants/editor';
import styles from './editor-page.module.scss';

interface EditorPageProps {
  type: EditorType;
}

function getInitialContent(type: EditorType) {
  if (type === 'code-mirror') {
    return CODE_MIRROR_CONTENT_EXAMPLE;
  }

  if (type === 'tiptap-markdown-editor') {
    return MARKDOWN_CONTENT_EXAMPLE;
  }

  return RICHTEXT_CONTENT_EXAMPLE;
}

export function EditorPage({ type }: EditorPageProps) {
  const editorItem = getEditorItem(type);
  const [content, setContent] = React.useState(() => getInitialContent(type));

  React.useEffect(() => {
    setContent(getInitialContent(type));
  }, [type]);

  const editor = React.useMemo(() => {
    if (type === 'code-mirror') {
      return <CodeMirrorEditor value={content} onChange={setContent} />;
    }

    if (type === 'tiptap-markdown-editor') {
      return <DynamicMarkdownEditor value={content} onChange={setContent} />;
    }

    return <DynamicSimpleEditor value={content} onChange={setContent} />;
  }, [content, type]);

  const preview = React.useMemo(() => {
    if (type === 'code-mirror' || type === 'tiptap-markdown-editor') {
      return (
        <DynamicMarkdownEditorViewer
          key={type}
          content={content}
          renderImagesWithAntd={type === 'code-mirror'}
        />
      );
    }

    return <DynamicSimpleEditorViewer content={content} />;
  }, [content, type]);

  return (
    <section className={styles['editor-page']}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <h1>{editorItem.title}</h1>
          <p>{editorItem.description}</p>
        </header>
        <div className={styles.workspace}>
          <section className={styles.panel} aria-label={`${editorItem.label} 编辑区`}>
            <div className={styles['panel-header']}>
              <h2>编辑</h2>
            </div>
            <div
              className={`${styles['editor-shell']} ${
                type === 'code-mirror' ? styles['code-mirror-shell'] : ''
              }`}
            >
              {editor}
            </div>
          </section>
          <section className={styles.panel} aria-label={`${editorItem.label} 实时预览`}>
            <div className={styles['panel-header']}>
              <h2>预览</h2>
            </div>
            <div className={styles['preview-shell']}>{preview}</div>
          </section>
        </div>
      </div>
    </section>
  );
}
