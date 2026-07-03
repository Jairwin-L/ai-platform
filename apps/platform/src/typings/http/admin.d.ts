declare namespace IApiAdmin {
  interface AdminRole {
    created_at: string;
    description: string | null;
    id: string;
    is_system: boolean;
    name: string;
    permission_count: number;
    permissions?: string[];
    updated_at: string;
    user_count: number;
  }

  interface AdminPermission {
    children?: AdminPermission[];
    code: string;
    created_at?: string;
    description: string | null;
    id: string;
    name: string;
    parent_id: string | null;
    type: PermissionType;
    updated_at?: string;
  }

  type PermissionType = 'data' | 'module' | 'operation' | 'page' | 'system';

  interface ListParams {
    page?: number;
    pageSize?: number;
    searchTerm?: string;
    tree?: boolean;
    type?: PermissionType | 'all';
  }

  interface RolePayload {
    description?: string;
    is_system?: boolean;
    name: string;
    permissions?: string[];
  }

  interface PermissionPayload {
    code: string;
    description?: string;
    name: string;
    parent_id: number | null;
    type: PermissionType;
  }

  interface SystemSettings {
    allowRegistration: boolean;
    byokAllowedOrigins: string;
    defaultLanguage: 'en-US' | 'zh-CN';
    displayName: string;
    maintenanceMode: boolean;
    sessionPolicy: 'standard' | 'strict';
    supportEmail: string;
    updatedAt: string;
  }

  type SystemSettingsPayload = Omit<SystemSettings, 'updatedAt'>;

  interface AiProviderOption {
    color: string;
    enabled: boolean;
    label: string;
    value: string;
  }
}
