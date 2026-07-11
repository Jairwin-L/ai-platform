'use client';

import * as React from 'react';
import { Highlight } from '@tiptap/extension-highlight';
import { Image } from '@tiptap/extension-image';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { TaskItem } from '@tiptap/extension-task-item';
import { TaskList } from '@tiptap/extension-task-list';
import { TextAlign } from '@tiptap/extension-text-align';
import { Typography } from '@tiptap/extension-typography';
import { Underline } from '@tiptap/extension-underline';
import Youtube from '@tiptap/extension-youtube';
import { Markdown } from '@tiptap/markdown';
import { EditorContent, EditorContext, useEditor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { ColoredText } from '@/components/tiptap-extension/colored-text-extension';
import { Link } from '@/components/tiptap-extension/link-extension';
import { Selection } from '@/components/tiptap-extension/selection-extension';
import { TrailingNode } from '@/components/tiptap-extension/trailing-node-extension';
import { TIPTAP_IMAGE_HTML_ATTRIBUTES } from '@/constants/tiptap';
import '@/components/tiptap-node/code-block-node/code-block-node.scss';
import '@/components/tiptap-node/list-node/list-node.scss';
import '@/components/tiptap-node/image-node/image-node.scss';
import '@/components/tiptap-node/paragraph-node/paragraph-node.scss';
import '@/components/tiptap-templates/simple/simple-editor.scss';

function writeTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();

  return Promise.resolve();
}

export const MarkdownEditorViewer = React.forwardRef(
  ({ content, onUpdate }: IEditorComponent.MarkdownEditorViewerProps, ref) => {
    const editor = useEditor({
      immediatelyRender: false,
      editable: false,
      contentType: 'markdown',
      editorProps: {
        attributes: {
          autocomplete: 'off',
          autocorrect: 'off',
          autocapitalize: 'off',
          'aria-label': 'Markdown content preview.',
        },
      },
      extensions: [
        StarterKit,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Underline,
        ColoredText,
        TaskList,
        TaskItem.configure({ nested: true }),
        Highlight.configure({ multicolor: true }),
        Image.configure({
          HTMLAttributes: TIPTAP_IMAGE_HTML_ATTRIBUTES,
        }),
        Typography,
        Superscript,
        Subscript,
        Selection,
        TrailingNode,
        Link.configure({ openOnClick: true }),
        Youtube.configure({
          width: 640,
          height: 480,
          controls: true,
        }),
        Markdown,
      ],
      content,
      onUpdate: ({ editor: currentEditor }) => {
        onUpdate?.(currentEditor.getMarkdown());
      },
    });

    React.useEffect(() => {
      if (!editor || content === editor.getMarkdown()) return;
      editor.commands.setContent(content, { emitUpdate: false, contentType: 'markdown' });
    }, [editor, content]);

    const onViewerClick = async (event: React.MouseEvent<HTMLDivElement>) => {
      if (!(event.target instanceof HTMLElement)) return;

      const codeBlock = event.target.closest('pre');
      if (!(codeBlock instanceof HTMLPreElement)) return;

      const codeBlockRect = codeBlock.getBoundingClientRect();
      const isCopyAction =
        event.clientY >= codeBlockRect.top &&
        event.clientY <= codeBlockRect.top + 38 &&
        event.clientX >= codeBlockRect.right - 128 &&
        event.clientX <= codeBlockRect.right;

      if (!isCopyAction) return;

      event.preventDefault();
      event.stopPropagation();

      const codeElement = codeBlock.querySelector('code');
      if (!codeElement) return;

      try {
        await writeTextToClipboard(codeElement.textContent || '');
        codeBlock.classList.add('is-code-copied');
      } catch {
        codeBlock.classList.remove('is-code-copied');
      } finally {
        window.setTimeout(() => {
          codeBlock.classList.remove('is-code-copied');
        }, 1600);
      }
    };

    React.useImperativeHandle(
      ref,
      () => ({
        getHTML: () => editor?.getHTML() || '',
        getMarkdown: () => editor?.getMarkdown() || '',
      }),
      [editor],
    );

    return (
      <EditorContext.Provider value={{ editor }}>
        <div className="content-wrapper simple-editor-viewer-container" onClick={onViewerClick}>
          <EditorContent
            editor={editor}
            role="presentation"
            className="simple-editor-viewer-content"
          />
        </div>
      </EditorContext.Provider>
    );
  },
);

MarkdownEditorViewer.displayName = 'MarkdownEditorViewer';
