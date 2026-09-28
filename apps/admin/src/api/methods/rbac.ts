/**
 * @file 用户、角色、权限接口，对应 apps/db-service 的 Users / Roles / Permissions 控制器。
 */
import { RBAC } from '../const';
import { del, get, post, put } from '../request';

export type AdminPermission = IApiAdmin.AdminPermission;
export type AdminRole = IApiAdmin.AdminRole & { permissionsTree?: AdminPermission[] };
export type PermissionPayload = IApiAdmin.PermissionPayload;
export type RolePayload = IApiAdmin.RolePayload;
export type UserListItem = IApiUsers.UserListItem;
export type UserProfile = IApiUsers.UserProfile;
export type UserStatus = IApiUsers.UserStatus;
export type PaginatedData<T> = IHttpCommon.PaginatedData<T>;

export function getUsers(params: IApiUsers.UserListParams = {}) {
  return get<PaginatedData<UserListItem>>(RBAC.USERS, params);
}

export function getUser(id: string) {
  return get<UserProfile>(`${RBAC.USERS}/${encodeURIComponent(id)}`);
}

export function updateUser(id: string, payload: IApiUsers.UserUpdatePayload) {
  return put<UserProfile>(`${RBAC.USERS}/${encodeURIComponent(id)}`, { ...payload });
}

export function getRoles(params: IApiAdmin.ListParams = {}) {
  return get<PaginatedData<AdminRole>>(RBAC.ROLES, { ...params });
}

export function getRole(id: string) {
  return get<AdminRole>(`${RBAC.ROLES}/${id}`);
}

export function createRole(payload: RolePayload) {
  return post<AdminRole>(RBAC.ROLES, { ...payload });
}

export function updateRole(id: string, payload: RolePayload) {
  return put<AdminRole>(`${RBAC.ROLES}/${id}`, { ...payload });
}

export function deleteRole(id: string) {
  return del<{ id: string }>(`${RBAC.ROLES}/${id}`);
}

export function getPermissions(params: IApiAdmin.ListParams = {}) {
  return get<PaginatedData<AdminPermission>>(RBAC.PERMISSIONS, { ...params });
}

/** 权限树：角色授权与上级权限选择都需要整棵树 */
export function getPermissionTree() {
  return getPermissions({ tree: true, page: 1, pageSize: 1000 });
}

export function getPermission(id: string) {
  return get<AdminPermission>(`${RBAC.PERMISSIONS}/${id}`);
}

export function createPermission(payload: PermissionPayload) {
  return post<AdminPermission>(RBAC.PERMISSIONS, { ...payload });
}

export function updatePermission(id: string, payload: PermissionPayload) {
  return put<AdminPermission>(`${RBAC.PERMISSIONS}/${id}`, { ...payload });
}

export function deletePermission(id: string) {
  return del<{ id: string }>(`${RBAC.PERMISSIONS}/${id}`);
}
