import { alovaDelete, alovaGet, alovaPost, alovaPut } from '@/api/alova';

export type AdminPermission = IApiAdmin.AdminPermission;
export type AdminRole = IApiAdmin.AdminRole;
export type AiProviderOption = IApiAdmin.AiProviderOption;
export type ListParams = IApiAdmin.ListParams;
export type PermissionPayload = IApiAdmin.PermissionPayload;
export type PermissionType = IApiAdmin.PermissionType;
export type RolePayload = IApiAdmin.RolePayload;
export type SystemSettings = IApiAdmin.SystemSettings;
export type SystemSettingsPayload = IApiAdmin.SystemSettingsPayload;
export type ThirdPartyServiceOption = IApiAdmin.ThirdPartyServiceOption;

function getQueryParams(params: ListParams): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
  );
}

export async function getRoles(
  params: ListParams = {},
): Promise<IHttpCommon.PaginatedData<AdminRole>> {
  return alovaGet<IHttpCommon.PaginatedData<AdminRole>>('/roles', getQueryParams(params));
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
): Promise<IHttpCommon.PaginatedData<AdminPermission>> {
  return alovaGet<IHttpCommon.PaginatedData<AdminPermission>>(
    '/permissions',
    getQueryParams(params),
  );
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

export async function getAdminAiProviderOption(value: string): Promise<AiProviderOption> {
  return alovaGet<AiProviderOption>(`/admin/ai-providers/${encodeURIComponent(value)}`);
}

export async function createAdminAiProviderOption(
  payload: AiProviderOption,
): Promise<AiProviderOption> {
  return alovaPost<AiProviderOption>('/admin/ai-providers', payload);
}

export async function updateAdminAiProviderOption(
  value: string,
  payload: AiProviderOption,
): Promise<AiProviderOption> {
  return alovaPut<AiProviderOption>(`/admin/ai-providers/${encodeURIComponent(value)}`, payload);
}

export async function deleteAdminAiProviderOption(value: string): Promise<void> {
  await alovaDelete<{ value: string }>(`/admin/ai-providers/${encodeURIComponent(value)}`);
}

export async function updateAdminAiProviderOptions(
  options: AiProviderOption[],
): Promise<AiProviderOption[]> {
  return alovaPut<AiProviderOption[]>('/admin/ai-providers', { options });
}

export async function getAdminThirdPartyServiceOptions(): Promise<ThirdPartyServiceOption[]> {
  return alovaGet<ThirdPartyServiceOption[]>('/admin/third-party-services');
}

export async function getAdminThirdPartyServiceOption(
  value: string,
): Promise<ThirdPartyServiceOption> {
  return alovaGet<ThirdPartyServiceOption>(
    `/admin/third-party-services/${encodeURIComponent(value)}`,
  );
}

export async function createAdminThirdPartyServiceOption(
  payload: ThirdPartyServiceOption,
): Promise<ThirdPartyServiceOption> {
  return alovaPost<ThirdPartyServiceOption>('/admin/third-party-services', payload);
}

export async function updateAdminThirdPartyServiceOption(
  value: string,
  payload: ThirdPartyServiceOption,
): Promise<ThirdPartyServiceOption> {
  return alovaPut<ThirdPartyServiceOption>(
    `/admin/third-party-services/${encodeURIComponent(value)}`,
    payload,
  );
}

export async function deleteAdminThirdPartyServiceOption(value: string): Promise<void> {
  await alovaDelete<{ value: string }>(`/admin/third-party-services/${encodeURIComponent(value)}`);
}

export async function updateAdminThirdPartyServiceOptions(
  options: ThirdPartyServiceOption[],
): Promise<ThirdPartyServiceOption[]> {
  return alovaPut<ThirdPartyServiceOption[]>('/admin/third-party-services', { options });
}
