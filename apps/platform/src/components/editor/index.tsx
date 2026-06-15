'use client';

import * as React from 'react';

// --- Tiptap Core Extensions ---
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
import { EditorContent, EditorContext, useEditor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Input, Modal, message } from 'antd';

// --- Custom Extensions ---
import { Link } from '@/components/tiptap-extension/link-extension';
import { Selection } from '@/components/tiptap-extension/selection-extension';
import { TrailingNode } from '@/components/tiptap-extension/trailing-node-extension';
import { ArrowLeftIcon } from '@/components/tiptap-icons/arrow-left-icon';
import { HighlighterIcon } from '@/components/tiptap-icons/highlighter-icon';
import { LinkIcon } from '@/components/tiptap-icons/link-icon';

// --- UI Primitives ---
import { Button } from '@/components/tiptap-ui-primitive/button';
import { Spacer } from '@/components/tiptap-ui-primitive/spacer';
import { Toolbar, ToolbarGroup, ToolbarSeparator } from '@/components/tiptap-ui-primitive/toolbar';

// --- Tiptap Node ---
import { ImageUploadNode } from '@/components/tiptap-node/image-upload-node/image-upload-node-extension';
import '@/components/tiptap-node/code-block-node/code-block-node.scss';
import '@/components/tiptap-node/list-node/list-node.scss';
import '@/components/tiptap-node/image-node/image-node.scss';
import '@/components/tiptap-node/paragraph-node/paragraph-node.scss';

// --- Tiptap UI ---
import { HeadingDropdownMenu } from '@/components/tiptap-ui/heading-dropdown-menu';
import {
  HighlightPopover,
  HighlightContent,
  HighlighterButton,
} from '@/components/tiptap-ui/highlight-popover';
import { ImageUploadButton } from '@/components/tiptap-ui/image-upload-button';
import { LinkPopover, LinkContent, LinkButton } from '@/components/tiptap-ui/link-popover';
import { ListDropdownMenu } from '@/components/tiptap-ui/list-dropdown-menu';
import { MarkButton } from '@/components/tiptap-ui/mark-button';
import { NodeButton } from '@/components/tiptap-ui/node-button';
import { TextAlignButton } from '@/components/tiptap-ui/text-align-button';
import { UndoRedoButton } from '@/components/tiptap-ui/undo-redo-button';

// --- Hooks ---
import { useMobile } from '@/hooks/use-mobile';
import { useWindowSize } from '@/hooks/use-window-size';

// --- Lib ---
import { handleImageUpload, MAX_FILE_SIZE } from '@/lib/tiptap-utils';

// --- Styles ---
import '@/components/tiptap-templates/simple/simple-editor.scss';

const MainToolbarContent = ({
  onHighlighterClick,
  onLinkClick,
  addYoutubeVideo,
  isMobile,
}: {
  onHighlighterClick: () => void;
  onLinkClick: () => void;
  addYoutubeVideo: () => void;
  isMobile: boolean;
}) => {
  return (
    <>
      {/* <Spacer /> */}

      <ToolbarGroup>
        <UndoRedoButton action="undo" />
        <UndoRedoButton action="redo" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <HeadingDropdownMenu levels={[1, 2, 3, 4]} />
        <ListDropdownMenu types={['bulletList', 'orderedList', 'taskList']} />
        <NodeButton type="codeBlock" />
        <NodeButton type="blockquote" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="bold" />
        <MarkButton type="italic" />
        <MarkButton type="strike" />
        <MarkButton type="code" />
        <MarkButton type="underline" />
        {!isMobile ? <HighlightPopover /> : <HighlighterButton onClick={onHighlighterClick} />}
        {!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
      </ToolbarGroup>

      <ToolbarSeparator />

      {/* <ToolbarGroup>
        <MarkButton type="superscript" />
        <MarkButton type="subscript" />
      </ToolbarGroup>

      <ToolbarSeparator /> */}

      <ToolbarGroup>
        <TextAlignButton align="left" />
        <TextAlignButton align="center" />
        <TextAlignButton align="right" />
        <TextAlignButton align="justify" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <ImageUploadButton />
        <Button
          data-style="ghost"
          tooltip="Add Youtube Video"
          onClick={addYoutubeVideo}
          className="tiptap-button"
        >
          {/* TODO: Add Youtube icon */}
          <span className="tiptap-button-text md:block hidden">Youtube</span>
        </Button>
      </ToolbarGroup>

      <Spacer />

      {isMobile && <ToolbarSeparator />}
    </>
  );
};

const MobileToolbarContent = ({
  type,
  onBack,
}: {
  type: 'highlighter' | 'link';
  onBack: () => void;
}) => (
  <>
    <ToolbarGroup>
      <Button data-style="ghost" onClick={onBack}>
        <ArrowLeftIcon className="tiptap-button-icon" />
        {type === 'highlighter' ? (
          <HighlighterIcon className="tiptap-button-icon" />
        ) : (
          <LinkIcon className="tiptap-button-icon" />
        )}
      </Button>
    </ToolbarGroup>

    <ToolbarSeparator />

    {type === 'highlighter' ? <HighlightContent /> : <LinkContent />}
  </>
);

interface SimpleEditorProps {
  content?: string;
  value?: string;
  onUpdate?: (html: string) => void;
  onChange?: (html: string) => void;
}

export const SimpleEditor = React.forwardRef(
  ({ content, value, onUpdate, onChange }: SimpleEditorProps, ref) => {
    const isMobile = useMobile();
    const windowSize = useWindowSize();
    const editorContent = value ?? content ?? '';
    const [mobileView, setMobileView] = React.useState<'main' | 'highlighter' | 'link'>('main');
    const [rect] = React.useState<Pick<DOMRect, 'x' | 'y' | 'width' | 'height'>>({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    });
    const toolbarRef = React.useRef<HTMLDivElement>(null);

    // React.useEffect(() => {
    //   const updateRect = () => {
    //     setRect(document.body.getBoundingClientRect())
    //   }

    //   updateRect()

    //   const resizeObserver = new ResizeObserver(updateRect)
    //   resizeObserver.observe(document.body)

    //   // window.addEventListener('scroll', updateRect)

    //   return () => {
    //     resizeObserver.disconnect()
    //     // window.removeEventListener('scroll', updateRect)
    //   }
    // }, [])

    const emitChange = React.useCallback(
      (html: string) => {
        onUpdate?.(html);
        onChange?.(html);
      },
      [onChange, onUpdate],
    );

    const editor = useEditor({
      immediatelyRender: false,
      shouldRerenderOnTransaction: false,
      editorProps: {
        attributes: {
          autocomplete: 'off',
          autocorrect: 'off',
          autocapitalize: 'off',
          'aria-label': 'Main content area, start typing to enter text.',
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
        ImageUploadNode.configure({
          accept: 'image/*',
          maxSize: MAX_FILE_SIZE,
          limit: 20,
          upload: handleImageUpload,
          onError: (error) => {
            console.error('Upload failed:', error);
            message.error(error.message || '图片上传失败');
          },
        }),
        TrailingNode,
        Link.configure({ openOnClick: false }),
        Youtube.configure({
          width: 640,
          height: 480,
          controls: true,
        }),
      ],
      content: editorContent,
      onUpdate: ({ editor: currentEditor }) => emitChange(currentEditor.getHTML()),
    });

    React.useImperativeHandle(
      ref,
      () => ({
        getHTML: () => editor?.getHTML() || '',
      }),
      [editor],
    );

    // 当外部 content 变化时，同步更新编辑器内容（避免无限循环）
    React.useEffect(() => {
      if (!editor) return;

      // 只在内容真正不同时才更新，避免光标位置丢失
      const currentContent = editor.getHTML();
      const nextContent = editorContent || '<p></p>';
      if (nextContent !== currentContent) {
        editor.commands.setContent(nextContent, { emitUpdate: false });
      }
    }, [editor, editorContent]);

    React.useEffect(() => {
      const checkCursorVisibility = () => {
        if (!editor || !toolbarRef.current) return;

        const { state, view } = editor;
        if (!view.hasFocus()) return;

        const { from } = state.selection;
        const cursorCoords = view.coordsAtPos(from);

        if (windowSize.height < rect.height) {
          if (cursorCoords && toolbarRef.current) {
            const toolbarHeight = toolbarRef.current.getBoundingClientRect().height;
            const isEnoughSpace = windowSize.height - cursorCoords.top - toolbarHeight > 0;

            // If not enough space, scroll until the cursor is the middle of the screen
            if (!isEnoughSpace) {
              const scrollY = cursorCoords.top - windowSize.height / 2 + toolbarHeight;
              window.scrollTo({
                top: scrollY,
                behavior: 'smooth',
              });
            }
          }
        }
      };

      checkCursorVisibility();
    }, [editor, rect.height, windowSize.height]);

    React.useEffect(() => {
      if (!isMobile && mobileView !== 'main') {
        setMobileView('main');
      }
    }, [isMobile, mobileView]);

    const addYoutubeVideo = () => {
      let youtubeUrl = '';

      Modal.confirm({
        title: 'Enter YouTube URL',
        content: (
          <Input
            autoFocus
            onChange={(event) => {
              youtubeUrl = event.target.value;
            }}
          />
        ),
        onOk: () => {
          if (editor && youtubeUrl) {
            editor.commands.setYoutubeVideo({ src: youtubeUrl });
          }
        },
      });
    };

    const handleEditorContainerMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
      if (!editor) return;
      if (!(event.target instanceof HTMLElement)) return;
      if (event.target.closest('.ProseMirror')) return;

      editor.commands.focus('end');
    };

    // 如果编辑器还未初始化，显示加载状态
    if (!editor) {
      return (
        <div className="simple-editor-loading">
          <div>Loading editor...</div>
        </div>
      );
    }

    return (
      <EditorContext.Provider value={{ editor }}>
        <Toolbar
          ref={toolbarRef}
          // style={
          //   isMobile
          //     ? {
          //         bottom: `calc(100% - ${windowSize.height - rect.y}px)`
          //       }
          //     : {}
          // }
        >
          {mobileView === 'main' ? (
            <MainToolbarContent
              onHighlighterClick={() => setMobileView('highlighter')}
              onLinkClick={() => setMobileView('link')}
              addYoutubeVideo={addYoutubeVideo}
              isMobile={isMobile}
            />
          ) : (
            <MobileToolbarContent
              type={mobileView === 'highlighter' ? 'highlighter' : 'link'}
              onBack={() => setMobileView('main')}
            />
          )}
        </Toolbar>

        <div className="content-wrapper" onMouseDown={handleEditorContainerMouseDown}>
          <EditorContent editor={editor} role="presentation" className="simple-editor-content" />
        </div>
      </EditorContext.Provider>
    );
  },
);

SimpleEditor.displayName = 'SimpleEditor';
