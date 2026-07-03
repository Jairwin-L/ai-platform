declare namespace ITiptapPrimitive {
  type PlatformShortcuts = Record<string, string>;

  interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    className?: string;
    showTooltip?: boolean;
    tooltip?: React.ReactNode;
    shortcutKeys?: string;
  }

  type SeparatorOrientation = 'horizontal' | 'vertical';

  interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
    orientation?: SeparatorOrientation;
    decorative?: boolean;
  }

  type SpacerOrientation = 'horizontal' | 'vertical';

  interface SpacerProps extends React.HTMLAttributes<HTMLDivElement> {
    orientation?: SpacerOrientation;
    size?: string | number;
  }

  type ToolbarBaseProps = React.HTMLAttributes<HTMLDivElement>;

  interface ToolbarProps extends ToolbarBaseProps {
    variant?: 'floating' | 'fixed';
  }

  interface TooltipProviderProps {
    children: React.ReactNode;
    initialOpen?: boolean;
    placement?: import('@floating-ui/react').Placement;
    open?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
    delay?: number;
    closeDelay?: number;
    timeout?: number;
    useDelayGroup?: boolean;
  }

  interface TooltipTriggerProps extends Omit<React.HTMLProps<HTMLElement>, 'ref'> {
    asChild?: boolean;
    children: React.ReactNode;
  }

  interface TooltipContentProps extends Omit<React.HTMLProps<HTMLDivElement>, 'ref'> {
    children?: React.ReactNode;
    portal?: boolean;
    portalProps?: Omit<
      React.ComponentProps<typeof import('@floating-ui/react').FloatingPortal>,
      'children'
    >;
  }

  type TooltipContextValue = import('@floating-ui/react').UseFloatingReturn<
    import('@floating-ui/react').ReferenceType
  > & {
    open: boolean;
    setOpen: (isOpen: boolean) => void;
    getReferenceProps: (userProps?: React.HTMLProps<HTMLElement>) => Record<string, unknown>;
    getFloatingProps: (userProps?: React.HTMLProps<HTMLDivElement>) => Record<string, unknown>;
  };

  type PopoverSide = 'top' | 'right' | 'bottom' | 'left';
  type PopoverAlign = 'start' | 'center' | 'end';

  interface PopoverContextValue {
    [key: string]: any;
    setLabelId: (id: string | undefined) => void;
    setDescriptionId: (id: string | undefined) => void;
    updatePosition: (side: PopoverSide, align: PopoverAlign) => void;
  }

  interface PopoverOptions {
    initialOpen?: boolean;
    modal?: boolean;
    open?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
    side?: PopoverSide;
    align?: PopoverAlign;
  }

  interface PopoverProps extends PopoverOptions {
    children: React.ReactNode;
  }

  interface PopoverTriggerProps extends React.HTMLProps<HTMLElement> {
    asChild?: boolean;
  }

  interface PopoverContentProps extends React.HTMLProps<HTMLDivElement> {
    side?: PopoverSide;
    align?: PopoverAlign;
    portal?: boolean;
    portalProps?: Omit<
      React.ComponentProps<typeof import('@floating-ui/react').FloatingPortal>,
      'children'
    >;
  }

  type DropdownSide = 'top' | 'right' | 'bottom' | 'left';
  type DropdownAlign = 'start' | 'center' | 'end';

  interface DropdownMenuOptions {
    initialOpen?: boolean;
    open?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
    side?: DropdownSide;
    align?: DropdownAlign;
  }

  interface DropdownMenuProps extends DropdownMenuOptions {
    children: React.ReactNode;
  }

  interface DropdownContextValue {
    [key: string]: any;
    updatePosition: (side: DropdownSide, align: DropdownAlign) => void;
  }

  interface DropdownMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean;
  }

  interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
    orientation?: 'vertical' | 'horizontal';
    side?: DropdownSide;
    align?: DropdownAlign;
    portal?: boolean;
    portalProps?: Omit<
      React.ComponentProps<typeof import('@floating-ui/react').FloatingPortal>,
      'children'
    >;
  }

  interface DropdownMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {
    asChild?: boolean;
    disabled?: boolean;
    onSelect?: () => void;
  }

  interface DropdownMenuGroupProps extends React.HTMLAttributes<HTMLDivElement> {
    label?: string;
  }
}

declare namespace ITiptapUi {
  type HistoryAction = 'undo' | 'redo';
  type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
  type NodeType = 'codeBlock' | 'blockquote';
  type TextAlign = 'left' | 'center' | 'right' | 'justify';
  type ListType = 'bulletList' | 'orderedList' | 'taskList';
  type Mark = 'bold' | 'italic' | 'strike' | 'code' | 'underline' | 'superscript' | 'subscript';

  interface UndoRedoButtonProps extends ITiptapPrimitive.ButtonProps {
    editor?: import('@tiptap/react').Editor | null;
    text?: string;
    action: HistoryAction;
  }

  interface HeadingButtonProps extends Omit<ITiptapPrimitive.ButtonProps, 'type'> {
    editor?: import('@tiptap/react').Editor | null;
    level: HeadingLevel;
    text?: string;
    hideWhenUnavailable?: boolean;
  }

  interface ImageUploadButtonProps extends ITiptapPrimitive.ButtonProps {
    editor?: import('@tiptap/react').Editor | null;
    text?: string;
    extensionName?: string;
  }

  interface NodeButtonProps extends Omit<ITiptapPrimitive.ButtonProps, 'type'> {
    editor?: import('@tiptap/react').Editor | null;
    type: NodeType;
    text?: string;
    hideWhenUnavailable?: boolean;
  }

  interface TextAlignButtonProps extends ITiptapPrimitive.ButtonProps {
    editor?: import('@tiptap/react').Editor | null;
    align: TextAlign;
    text?: string;
    hideWhenUnavailable?: boolean;
  }

  interface HeadingDropdownMenuProps extends Omit<ITiptapPrimitive.ButtonProps, 'type'> {
    editor?: import('@tiptap/react').Editor | null;
    levels?: HeadingLevel[];
    hideWhenUnavailable?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
  }

  interface ListDropdownMenuProps extends Omit<ITiptapPrimitive.ButtonProps, 'type'> {
    editor?: import('@tiptap/react').Editor;
    types?: ListType[];
    hideWhenUnavailable?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
  }

  interface MarkButtonProps extends Omit<ITiptapPrimitive.ButtonProps, 'type'> {
    type: Mark;
    editor?: import('@tiptap/react').Editor | null;
    text?: string;
    hideWhenUnavailable?: boolean;
  }

  interface ListOption {
    label: string;
    type: ListType;
    icon: React.ElementType;
  }

  interface ListButtonProps extends Omit<ITiptapPrimitive.ButtonProps, 'type'> {
    editor?: import('@tiptap/react').Editor | null;
    type: ListType;
    text?: string;
    hideWhenUnavailable?: boolean;
  }

  interface HighlightColor {
    label: string;
    value: string;
    border?: string;
  }

  interface HighlightContentProps {
    editor?: import('@tiptap/react').Editor | null;
    colors?: HighlightColor[];
    activeNode?: number;
  }

  interface HighlightPopoverProps extends Omit<ITiptapPrimitive.ButtonProps, 'type'> {
    editor?: import('@tiptap/react').Editor | null;
    colors?: HighlightColor[];
    hideWhenUnavailable?: boolean;
  }

  interface LinkHandlerProps {
    editor: import('@tiptap/react').Editor | null;
    onSetLink?: () => void;
    onLinkActive?: () => void;
  }

  interface LinkMainProps {
    url: string;
    setUrl: React.Dispatch<React.SetStateAction<string>>;
    setLink: () => void;
    removeLink: () => void;
    isActive: boolean;
  }

  interface LinkContentProps {
    editor?: import('@tiptap/react').Editor | null;
  }

  interface LinkPopoverProps extends Omit<ITiptapPrimitive.ButtonProps, 'type'> {
    editor?: import('@tiptap/react').Editor | null;
    hideWhenUnavailable?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
    autoOpenOnLinkActive?: boolean;
  }
}

declare namespace ITiptapNode {
  interface FileItem {
    id: string;
    file: File;
    progress: number;
    status: 'uploading' | 'success' | 'error';
    url?: string;
    abortController?: AbortController;
  }

  interface UploadOptions {
    maxSize: number;
    limit: number;
    accept: string;
    upload: (
      file: File,
      onProgress: (progressEvent: { progress: number }) => void,
      signal: AbortSignal,
    ) => Promise<string>;
    onSuccess?: (url: string) => void;
    onError?: (error: Error) => void;
  }

  interface ImageUploadDragAreaProps {
    onFile: (files: File[]) => void;
    children?: React.ReactNode;
  }

  interface ImageUploadPreviewProps {
    file: File;
    progress: number;
    status: 'uploading' | 'success' | 'error';
    onRemove: () => void;
  }

  interface DropZoneContentProps {
    maxSize: number;
  }

  type UploadFunction = (
    file: File,
    onProgress?: (progressEvent: { progress: number }) => void,
    abortSignal?: AbortSignal,
  ) => Promise<string>;

  interface ImageUploadNodeOptions {
    accept?: string;
    limit?: number;
    maxSize?: number;
    upload?: UploadFunction;
    onError?: (error: Error) => void;
    onSuccess?: (url: string) => void;
  }

  interface TrailingNodeOptions {
    node: string;
    notAfter: string[];
  }
}
