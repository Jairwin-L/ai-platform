'use client';

import * as React from 'react';
import { EditorContent, EditorContext, useEditor } from '@tiptap/react';
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
import { StarterKit } from '@tiptap/starter-kit';
import { Link } from '@/components/tiptap-extension/link-extension';
import { Selection } from '@/components/tiptap-extension/selection-extension';
import { TrailingNode } from '@/components/tiptap-extension/trailing-node-extension';
import '@/components/tiptap-node/code-block-node/code-block-node.scss';
import '@/components/tiptap-node/list-node/list-node.scss';
import '@/components/tiptap-node/image-node/image-node.scss';
import '@/components/tiptap-node/paragraph-node/paragraph-node.scss';
import '@/components/tiptap-templates/simple/simple-editor.scss';

export const SimpleEditorViewer = React.forwardRef(
  ({ content, onUpdate }: IEditorComponent.SimpleEditorViewerProps, ref) => {
    const editor = useEditor({
      immediatelyRender: false,
      editable: false,
      editorProps: {
        attributes: {
          autocomplete: 'off',
          autocorrect: 'off',
          autocapitalize: 'off',
          'aria-label': 'Email content preview.',
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
      ],
      content,
      onUpdate: ({ editor: currentEditor }) => {
        onUpdate?.(currentEditor.getHTML());
      },
    });

    React.useEffect(() => {
      if (!editor || content === editor.getHTML()) return;
      editor.commands.setContent(content || '<p></p>', { emitUpdate: false });
    }, [editor, content]);

    React.useImperativeHandle(
      ref,
      () => ({
        getHTML: () => editor?.getHTML() || '',
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

SimpleEditorViewer.displayName = 'SimpleEditorViewer';
