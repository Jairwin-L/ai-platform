declare namespace IApiUsers {
  interface UserProfileRole {
    code: string;
    id: number;
    name: string;
    description: string | null;
    status: 'ENABLED' | 'DISABLED';
  }

  interface UserProfile {
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

  type UserListItem = Pick<
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

  type UserStatus = 'active' | 'pending' | 'restricted' | 'banned' | 'inactive';

  interface UserUpdatePayload {
    bio?: string | null;
    full_name?: string | null;
    nick_name?: string | null;
    roleIds?: number[];
    status?: UserStatus;
    user_name?: string | null;
  }

  interface UserListParams extends Record<string, unknown> {
    page?: number;
    pageSize?: number;
    role?: string;
    searchTerm?: string;
    status?: UserStatus | 'all';
  }
}
