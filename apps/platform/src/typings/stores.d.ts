declare namespace IStore {
  interface AuthSessionState {
    currentUserProfile: IApiUsers.UserProfile | null;
    isLoading: boolean;
    isReady: boolean;
    payload: IApiAuth.AuthPayload | null;
    clearSession: () => void;
    setCurrentUserProfile: (profile: IApiUsers.UserProfile) => void;
    setPayload: (payload: IApiAuth.AuthPayload | null) => void;
  }
}
