import { alovaDelete, alovaGet, alovaPost, alovaPut } from '@/api/alova';

interface PaginatedData<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface AdminRole {
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

export interface AdminPermission {
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

export type PermissionType = 'data' | 'module' | 'operation' | 'page' | 'system';

export interface ListParams {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  tree?: boolean;
  type?: PermissionType | 'all';
}

export interface RolePayload {
  description?: string;
  is_system?: boolean;
  name: string;
  permissions?: string[];
}

export interface PermissionPayload {
  code: string;
  description?: string;
  name: string;
  parent_id: number | null;
  type: PermissionType;
}

export interface SystemSettings {
  allowRegistration: boolean;
  byokAllowedOrigins: string;
  defaultLanguage: 'en-US' | 'zh-CN';
  displayName: string;
  maintenanceMode: boolean;
  sessionPolicy: 'standard' | 'strict';
  supportEmail: string;
  updatedAt: string;
}

export type SystemSettingsPayload = Omit<SystemSettings, 'updatedAt'>;

export interface AiProviderOption {
  color: string;
  enabled: boolean;
  label: string;
  value: string;
}

function getQueryParams(params: ListParams): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
  );
}

export async function getRoles(params: ListParams = {}): Promise<PaginatedData<AdminRole>> {
  return alovaGet<PaginatedData<AdminRole>>('/roles', getQueryParams(params));
}

export async function getRole(id: string): Promise<AdminRole> {
  return alovaGet<AdminRole>(`/roles/${id}`);
}

export async function createRole(payload: RolePayload): Promise<AdminRole> {
  return alovaPost<AdminRole>('/roles', payload);
}

export async function updateRole(id: string, payload: RolePayload): Promise<AdminRole> {
  return alovaPut<AdminRole>(`/roles/${id}`, payload);
}

export async function deleteRole(id: string): Promise<void> {
  await alovaDelete<{ id: string }>(`/roles/${id}`);
}

export async function getPermissions(
  params: ListParams = {},
): Promise<PaginatedData<AdminPermission>> {
  return alovaGet<PaginatedData<AdminPermission>>('/permissions', getQueryParams(params));
}

export async function getPermission(id: string): Promise<AdminPermission> {
  return alovaGet<AdminPermission>(`/permissions/${id}`);
}

export async function createPermission(payload: PermissionPayload): Promise<AdminPermission> {
  return alovaPost<AdminPermission>('/permissions', payload);
}

export async function updatePermission(
  id: string,
  payload: PermissionPayload,
): Promise<AdminPermission> {
  return alovaPut<AdminPermission>(`/permissions/${id}`, payload);
}

export async function deletePermission(id: string): Promise<void> {
  await alovaDelete<{ id: string }>(`/permissions/${id}`);
}

export async function getSystemSettings(): Promise<SystemSettings> {
  return alovaGet<SystemSettings>('/system-settings');
}

export async function updateSystemSettings(
  payload: SystemSettingsPayload,
): Promise<SystemSettings> {
  return alovaPut<SystemSettings>('/system-settings', payload);
}

export async function getAdminAiProviderOptions(): Promise<AiProviderOption[]> {
  return alovaGet<AiProviderOption[]>('/admin/ai-providers');
}

export async function updateAdminAiProviderOptions(
  options: AiProviderOption[],
): Promise<AiProviderOption[]> {
  return alovaPut<AiProviderOption[]>('/admin/ai-providers', { options });
}
