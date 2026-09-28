/**
 * @file RBAC 接口，对应 apps/db-service 的 Permissions / Roles / Users / UserRoles / PlatformUsers 控制器。
 */
import { RBAC } from '../const';
import { del, get, post, put } from '../request';

export type PermissionKind = IApiAdmin.PermissionKind;
export type RbacPermission = IApiAdmin.ResourceNode;
export type RbacRole = IApiAdmin.RbacRole;
export type RbacUser = IApiAdmin.RbacUser;
export type RoleUser = IApiAdmin.RoleUser;
export type PlatformUser = IApiAdmin.PlatformUser;
export type PlatformUserStatus = IApiAdmin.PlatformUserStatus;
export type PlatformUserStatusPayload = IApiAdmin.PlatformUserStatusPayload;
export type PermissionPayload = IApiAdmin.PermissionPayload;
export type RolePayload = IApiAdmin.RolePayload;
export type UserStatus = IApiUsers.UserStatus;
export type PaginatedData<T> = IHttpCommon.PaginatedData<T>;

/**
 * @title 菜单资源
 */
export function getRbacPermissions(params: IApiAdmin.PermissionListParams = {}) {
  return get<PaginatedData<RbacPermission>>(RBAC.PERMISSIONS, {
    page: 1,
    pageSize: 1000,
    ...params,
  });
}

export function getRbacPermission(id: string) {
  return get<RbacPermission>(`${RBAC.PERMISSIONS}/${encodeURIComponent(id)}`);
}

export function createRbacPermission(payload: PermissionPayload) {
  return post<RbacPermission>(RBAC.PERMISSIONS, { ...payload });
}

export function updateRbacPermission(id: string, payload: Partial<PermissionPayload>) {
  return put<RbacPermission>(`${RBAC.PERMISSIONS}/${encodeURIComponent(id)}`, { ...payload });
}

export function deleteRbacPermission(id: string) {
  return del<{ id: string }>(`${RBAC.PERMISSIONS}/${encodeURIComponent(id)}`);
}

/**
 * @title 角色
 */
export function getRbacRoles() {
  return get<RbacRole[]>(RBAC.ROLES);
}

export function getRbacRolePage(params: {
  enable?: boolean;
  page?: number;
  pageSize?: number;
  searchTerm?: string;
}) {
  return get<PaginatedData<RbacRole>>(RBAC.ROLE_PAGE, params);
}

export function getRoleUsers(roleId: string) {
  return get<RoleUser[]>(RBAC.ROLE_USER_LIST, { id: roleId });
}

export function setRoleUsers(roleId: string, userIds: string[]) {
  return post<{ roleId: string; userIds: string[] }>(RBAC.ROLE_SET_USER, { roleId, userIds });
}

export function createRbacRole(payload: RolePayload) {
  return post<RbacRole>(RBAC.ROLES, { ...payload });
}

export function updateRbacRole(id: string, payload: Partial<RolePayload>) {
  return put<RbacRole>(RBAC.ROLES, { id, ...payload });
}

export function deleteRbacRole(id: string) {
  return del<null>(RBAC.ROLES, { params: { id } });
}

/**
 * @title 系统用户
 */
export function getRbacUsers(params: {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  roleId?: string;
}) {
  return get<PaginatedData<RbacUser>>(RBAC.USERS, params);
}

export function getRbacUser(id: string) {
  return get<RbacUser>(`${RBAC.USERS}/${encodeURIComponent(id)}`);
}

export function createRbacUser(payload: IApiAdmin.CreateUserPayload) {
  return post<RbacUser>(RBAC.USERS, { ...payload });
}

export function updateRbacUser(id: string, payload: IApiAdmin.UpdateUserPayload) {
  return put<RbacUser>(`${RBAC.USERS}/${encodeURIComponent(id)}`, { ...payload });
}

export function resetRbacUserPassword(id: string, password: string) {
  return put<{ id: string }>(`${RBAC.USERS}/${encodeURIComponent(id)}`, { password });
}

export function deleteRbacUser(id: string) {
  return del<{ id: string }>(`${RBAC.USERS}/${encodeURIComponent(id)}`);
}

export function deleteRbacUsers(ids: string[]) {
  return del<{ ids: string[] }>(RBAC.USERS, { data: { ids } });
}

/** 编辑用户时与资料接口并发发出，成功提示交给资料接口，避免连弹两条 */
export function updateRbacUserRoles(userId: string, roleIds: string[]) {
  return post<{ userId: string; roles: IApiAdmin.RoleRef[] }>(
    RBAC.USER_ROLES,
    { userId, roleIds },
    { silentSuccess: true },
  );
}

/**
 * @title 平台注册用户
 */
export function getPlatformUsers(params: {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  status?: PlatformUserStatus;
}) {
  return get<PaginatedData<PlatformUser>>(RBAC.PLATFORM_USERS, params);
}

export function updatePlatformUserStatus(id: string, payload: PlatformUserStatusPayload) {
  return put<PlatformUser>(`${RBAC.PLATFORM_USERS}/${encodeURIComponent(id)}/status`, {
    ...payload,
  });
}
