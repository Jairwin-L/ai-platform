import { alovaGet, alovaPut } from '@/utils/alova';

export interface UserProfileRole {
  id: number;
  name: string;
  description: string | null;
}

export interface UserProfile {
  id: string;
  full_name: string | null;
  nick_name: string | null;
  user_name: string | null;
  picture: string | null;
  email: string | null;
  email_verified: boolean | null;
  bio: string | null;
  status: string;
  is_me: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  roles: UserProfileRole[];
}

export type UserListItem = Pick<
  UserProfile,
  | 'id'
  | 'full_name'
  | 'nick_name'
  | 'user_name'
  | 'picture'
  | 'email'
  | 'email_verified'
  | 'status'
  | 'last_login_at'
  | 'created_at'
  | 'roles'
>;

export type UserStatus = 'active' | 'pending' | 'restricted' | 'banned' | 'inactive';

export interface UserUpdatePayload {
  bio?: string | null;
  full_name?: string | null;
  nick_name?: string | null;
  roleIds?: number[];
  status?: UserStatus;
  user_name?: string | null;
}

interface PaginatedData<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface UserListParams extends Record<string, unknown> {
  page?: number;
  pageSize?: number;
  role?: string;
  searchTerm?: string;
  status?: UserStatus | 'all';
}

export async function getUserProfileById(id: string) {
  return alovaGet<UserProfile>(`/api/users/${id}`);
}

export async function getUsers(params: UserListParams = {}): Promise<PaginatedData<UserListItem>> {
  return alovaGet<PaginatedData<UserListItem>>('/api/users', params);
}

export async function updateUser(id: string, payload: UserUpdatePayload): Promise<UserProfile> {
  return alovaPut<UserProfile>(`/api/users/${id}`, payload);
}
