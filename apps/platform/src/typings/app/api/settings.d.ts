declare namespace ISettingsApi {
  interface SystemSettingsPayload {
    allowRegistration?: unknown;
    byokAllowedOrigins?: unknown;
    defaultLanguage?: unknown;
    displayName?: unknown;
    maintenanceMode?: unknown;
    sessionPolicy?: unknown;
    supportEmail?: unknown;
  }

  interface AiProviderPayload {
    options?: unknown;
  }

  interface ThirdPartyServicePayload {
    options?: unknown;
  }
}

declare namespace IRouteApi {
  interface PermissionNode {
    id: number;
    name: string;
    code: string;
    parent_id: number | null;
    type: import('@/generated/prisma/client').PermissionType;
    description: string | null;
    created_at?: Date;
    updated_at?: Date;
    children?: PermissionNode[];
  }

  interface RolePermissionNode {
    id: string;
    name: string;
    code: string;
    parent_id: string | null;
    type: string;
    children?: RolePermissionNode[];
  }

  interface AiCredentialRouteContext {
    params: Promise<{ credentialId: string }>;
  }

  interface ThirdPartyServiceCredentialRouteContext {
    params: Promise<{ credentialId: string }>;
  }

  interface IdRouteContext {
    params: Promise<{ id: string }>;
  }
}
