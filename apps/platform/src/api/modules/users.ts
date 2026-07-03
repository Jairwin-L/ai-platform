import { alovaGet, alovaPut } from '@/api/alova';

export type UserListItem = IApiUsers.UserListItem;
export type UserListParams = IApiUsers.UserListParams;
export type UserProfile = IApiUsers.UserProfile;
export type UserProfileRole = IApiUsers.UserProfileRole;
export type UserStatus = IApiUsers.UserStatus;
export type UserUpdatePayload = IApiUsers.UserUpdatePayload;

export async function getUserProfileById(id: string) {
  return alovaGet<UserProfile>(`/users/${id}`);
}

export async function getUsers(
  params: UserListParams = {},
): Promise<IHttpCommon.PaginatedData<UserListItem>> {
  return alovaGet<IHttpCommon.PaginatedData<UserListItem>>('/users', params);
}

export async function updateUser(id: string, payload: UserUpdatePayload): Promise<UserProfile> {
  return alovaPut<UserProfile>(`/users/${id}`, payload);
}
