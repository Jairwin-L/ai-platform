declare namespace IComponent {
  interface AdminMenuItem {
    children?: AdminMenuItem[];
    icon?: React.ReactNode;
    key: string;
    label: string;
  }

  interface AdminShellProps {
    children: React.ReactNode;
  }

  interface PermissionFormProps {
    permissionId?: string;
    parentId?: string;
  }

  interface RoleFormProps {
    roleId?: string;
  }

  interface PermissionTreeNode {
    children?: PermissionTreeNode[];
    title: string;
    value: string;
  }

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
