declare namespace IApiUsers {
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
  }

  type UserStatus = 'active' | 'pending' | 'restricted' | 'banned' | 'inactive';

  interface UserUpdatePayload {
    bio?: string | null;
    nick_name?: string | null;
  }
}
