declare namespace IComponent {
  interface AutoCenterProps {
    children: React.ReactNode;
    className?: string;
  }

  interface WrapperProps {
    children: React.ReactNode;
    initialAuthPayload: IApiAuth.AuthPayload | null;
  }

  interface ChildrenProps {
    children: React.ReactNode;
  }

  interface ShortcutDisplayProps {
    shortcuts: string[];
  }
}
