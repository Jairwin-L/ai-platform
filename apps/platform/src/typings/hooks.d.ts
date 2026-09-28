declare namespace IHooks {
  interface PermissionResult {
    isLoading: boolean;
    isReady: boolean;
    user: IApiAuth.AuthUser | null;
    clearSession: () => void;
    setCurrentUserProfile: (profile: IApiUsers.UserProfile) => void;
  }

  type MenuNavigationOrientation = 'horizontal' | 'vertical' | 'both';

  interface MenuNavigationOptions<T> {
    editor?: import('@tiptap/react').Editor | null;
    containerRef?: React.RefObject<HTMLElement | null>;
    query?: string;
    items: T[];
    onSelect?: (item: T) => void;
    onClose?: () => void;
    orientation?: MenuNavigationOrientation;
    autoSelectFirstItem?: boolean;
  }
}
