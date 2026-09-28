declare namespace IApiAuth {
  type AuthCodePurpose = 'sign-in' | 'sign-up';

  interface AuthUser {
    email: string | null;
    emailVerified: boolean | null;
    id: string;
    nickName: string | null;
    picture: string | null;
    status: string;
  }

  interface AuthPayload {
    permissions: string[];
    roles: string[];
    user: AuthUser;
  }
}
