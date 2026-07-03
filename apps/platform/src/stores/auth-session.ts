'use client';

import { create } from 'zustand';

type AuthSessionState = IStore.AuthSessionState;

export const useAuthSessionStore = create<AuthSessionState>((set) => ({
  currentUserProfile: null,
  isLoading: false,
  isReady: false,
  payload: null,
  clearSession: () => {
    set({ currentUserProfile: null, isLoading: false, isReady: true, payload: null });
  },
  setCurrentUserProfile: (profile) => {
    set((state) => {
      if (!state.payload || state.payload.user.id !== profile.id) {
        return { currentUserProfile: profile };
      }

      return {
        currentUserProfile: profile,
        payload: {
          ...state.payload,
          user: {
            ...state.payload.user,
            nickName: profile.nick_name,
            picture: profile.picture,
          },
        },
      };
    });
  },
  setPayload: (payload) => {
    set({
      currentUserProfile: null,
      isLoading: false,
      isReady: true,
      payload,
    });
  },
}));
