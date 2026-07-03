import '@tiptap/react';

declare module '@tiptap/react' {
  interface Commands<ReturnType> {
    imageUpload: {
      setImageUploadNode: (options?: ITiptapNode.ImageUploadNodeOptions) => ReturnType;
    };
  }
}
