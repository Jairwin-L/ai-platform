import { alovaGet } from '@/utils/alova';

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

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

function assertApiResponse<T>(response: unknown): ApiResponse<T> {
  const result = response as ApiResponse<T>;

  if (!result.success) {
    throw new Error(result.message || 'Request failed');
  }

  return result;
}

export async function getUserProfileById(id: string) {
  const response = await alovaGet(`/api/users/${id}`);
  return assertApiResponse<UserProfile>(response).data;
}
