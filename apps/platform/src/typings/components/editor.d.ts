declare namespace IEditorComponent {
  interface SimpleEditorViewerProps {
    content: string;
    onUpdate?: (html: string) => void;
  }

  interface DynamicSimpleEditorViewerProps {
    content: string;
  }

  interface SimpleEditorProps {
    content?: string;
    value?: string;
    onUpdate?: (html: string) => void;
    onChange?: (html: string) => void;
  }

  interface MarkdownEditorViewerProps {
    content: string;
    onUpdate?: (markdown: string) => void;
  }

  interface DynamicMarkdownEditorViewerProps {
    content: string;
  }

  interface MarkdownEditorProps {
    content?: string;
    value?: string;
    onUpdate?: (markdown: string) => void;
    onChange?: (markdown: string) => void;
  }
}
