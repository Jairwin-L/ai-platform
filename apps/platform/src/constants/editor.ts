export const EDITOR_ROUTE_BASE = '/editor';

export const EDITOR_ITEMS = [
  {
    type: 'code-mirror',
    label: 'CodeMirror',
    title: 'CodeMirror 编辑器',
    description: '面向代码输入的基础编辑器，支持语法高亮、行号和亮暗色适配。',
  },
  {
    type: 'tiptap-editor',
    label: 'Tiptap 富文本',
    title: 'Tiptap 富文本编辑器',
    description: '复用现有 Tiptap 富文本编辑器组件，支持常用内容编辑能力。',
  },
  {
    type: 'tiptap-markdown-editor',
    label: 'Tiptap Markdown',
    title: 'Tiptap Markdown 编辑器',
    description: '复用现有 Tiptap Markdown 编辑器组件，编辑状态以 Markdown 内容维护。',
  },
] as const;

export type EditorType = (typeof EDITOR_ITEMS)[number]['type'];

export const EDITOR_MENU_ITEMS = EDITOR_ITEMS.map((item) => ({
  ...item,
  href: `${EDITOR_ROUTE_BASE}/${item.type}`,
}));

export function isEditorType(type: string): type is EditorType {
  return EDITOR_ITEMS.some((item) => item.type === type);
}

export function getEditorItem(type: EditorType) {
  return EDITOR_MENU_ITEMS.find((item) => item.type === type)!;
}
export const CODE_MIRROR_CONTENT_EXAMPLE = `## CodeMirror Markdown

使用 CodeMirror 编辑 Markdown，并通过 Tiptap 实时预览。

### 列表

- 无序列表一
- 无序列表二
	- 嵌套列表

1. 有序列表一
2. 有序列表二

> 这是一段引用。

[Next.js](https://nextjs.org)

![图片](https://file-storage.jairwin.cc/file/placeholder-avatar.jpg)

\`\`\`ts
type Greeting = {
	name: string;
};

function createGreeting({ name }: Greeting) {
	return \`Hello, \${name}!\`;
}

console.log(createGreeting({ name: 'CodeMirror' }));
\`\`\``;
export const RICHTEXT_CONTENT_EXAMPLE =
  '<h2>开始编辑富文本</h2><p>这里复用现有 Tiptap 富文本编辑器组件。</p>';
export const MARKDOWN_CONTENT_EXAMPLE = `## 开始编辑 Markdown

这里复用现有 Tiptap Markdown 编辑器组件。`;
