import { Mark, mergeAttributes } from '@tiptap/react';
import type { ParseRule } from '@tiptap/pm/model';

function getColorFromStyle(style: string | null) {
  if (!style) return null;

  const colorMatch = style.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
  return colorMatch?.[1]?.trim() || null;
}

export const ColoredText = Mark.create({
  name: 'coloredText',

  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => {
          if (!(element instanceof HTMLElement)) return null;

          return getColorFromStyle(element.getAttribute('style')) || element.getAttribute('color');
        },
        renderHTML: (attributes) => {
          if (!attributes.color) return {};

          return {
            style: `color: ${attributes.color}`,
          };
        },
      },
    };
  },

  parseHTML(): ParseRule[] {
    return [
      {
        tag: 'span[style]',
        getAttrs: (element) => {
          if (!(element instanceof HTMLElement)) return false;

          return getColorFromStyle(element.getAttribute('style')) ? null : false;
        },
      },
      {
        tag: 'font[color]',
        getAttrs: (element) => {
          if (!(element instanceof HTMLElement)) return false;

          return element.getAttribute('color') ? null : false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },
});
