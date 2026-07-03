import { alovaDelete, alovaGet, alovaPost, alovaPut } from '@/utils/alova';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

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

function assertApiResponse<T>(response: unknown): ApiResponse<T> {
  const result = response as ApiResponse<T>;

  if (!result.success) {
    throw new Error(result.message || '请求失败');
  }

  return result;
}

function getQueryParams(params: ListParams): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
  );
}

export async function getRoles(params: ListParams = {}): Promise<PaginatedData<AdminRole>> {
  const response = await alovaGet('/api/roles', getQueryParams(params));
  return assertApiResponse<PaginatedData<AdminRole>>(response).data;
}

export async function getRole(id: string): Promise<AdminRole> {
  const response = await alovaGet(`/api/roles/${id}`);
  return assertApiResponse<AdminRole>(response).data;
}

export async function createRole(payload: RolePayload): Promise<AdminRole> {
  const response = await alovaPost('/api/roles', payload);
  return assertApiResponse<AdminRole>(response).data;
}

export async function updateRole(id: string, payload: RolePayload): Promise<AdminRole> {
  const response = await alovaPut(`/api/roles/${id}`, payload);
  return assertApiResponse<AdminRole>(response).data;
}

export async function deleteRole(id: string): Promise<void> {
  const response = await alovaDelete(`/api/roles/${id}`);
  assertApiResponse<{ id: string }>(response);
}

export async function getPermissions(
  params: ListParams = {},
): Promise<PaginatedData<AdminPermission>> {
  const response = await alovaGet('/api/permissions', getQueryParams(params));
  return assertApiResponse<PaginatedData<AdminPermission>>(response).data;
}

export async function getPermission(id: string): Promise<AdminPermission> {
  const response = await alovaGet(`/api/permissions/${id}`);
  return assertApiResponse<AdminPermission>(response).data;
}

export async function createPermission(payload: PermissionPayload): Promise<AdminPermission> {
  const response = await alovaPost('/api/permissions', payload);
  return assertApiResponse<AdminPermission>(response).data;
}

export async function updatePermission(
  id: string,
  payload: PermissionPayload,
): Promise<AdminPermission> {
  const response = await alovaPut(`/api/permissions/${id}`, payload);
  return assertApiResponse<AdminPermission>(response).data;
}

export async function deletePermission(id: string): Promise<void> {
  const response = await alovaDelete(`/api/permissions/${id}`);
  assertApiResponse<{ id: string }>(response);
}

export async function getSystemSettings(): Promise<SystemSettings> {
  const response = await alovaGet('/api/system-settings');
  return assertApiResponse<SystemSettings>(response).data;
}

export async function updateSystemSettings(
  payload: SystemSettingsPayload,
): Promise<SystemSettings> {
  const response = await alovaPut('/api/system-settings', payload);
  return assertApiResponse<SystemSettings>(response).data;
}

export async function getAdminAiProviderOptions(): Promise<AiProviderOption[]> {
  const response = await alovaGet('/api/admin/ai-providers');
  return assertApiResponse<AiProviderOption[]>(response).data;
}

export async function updateAdminAiProviderOptions(
  options: AiProviderOption[],
): Promise<AiProviderOption[]> {
  const response = await alovaPut('/api/admin/ai-providers', { options });
  return assertApiResponse<AiProviderOption[]>(response).data;
}
