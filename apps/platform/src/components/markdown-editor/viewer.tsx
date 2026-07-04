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
import { Link } from '@/components/tiptap-extension/link-extension';
import { Selection } from '@/components/tiptap-extension/selection-extension';
import { TrailingNode } from '@/components/tiptap-extension/trailing-node-extension';
import '@/components/tiptap-node/code-block-node/code-block-node.scss';
import '@/components/tiptap-node/list-node/list-node.scss';
import '@/components/tiptap-node/image-node/image-node.scss';
import '@/components/tiptap-node/paragraph-node/paragraph-node.scss';
import '@/components/tiptap-templates/simple/simple-editor.scss';

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
        TaskList,
        TaskItem.configure({ nested: true }),
        Highlight.configure({ multicolor: true }),
        Image,
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
        <div className="content-wrapper simple-editor-viewer-container">
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
