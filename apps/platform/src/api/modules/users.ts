import { alovaGet, alovaPut } from '@/api/alova';

export type UserProfile = IApiUsers.UserProfile;
export type UserStatus = IApiUsers.UserStatus;
export type UserUpdatePayload = IApiUsers.UserUpdatePayload;

export async function getUserProfileById(id: string) {
  return alovaGet<UserProfile>(`/users/${id}`);
}

export async function updateUser(id: string, payload: UserUpdatePayload): Promise<UserProfile> {
  return alovaPut<UserProfile>(`/users/${id}`, payload);
}
