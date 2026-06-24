'use client';

import { create } from 'zustand';
import type { AuthPayload } from '@/services/auth';
import type { UserProfile } from '@/services/users';

interface AuthSessionState {
  currentUserProfile: UserProfile | null;
  isLoading: boolean;
  isReady: boolean;
  payload: AuthPayload | null;
  clearSession: () => void;
  setCurrentUserProfile: (profile: UserProfile) => void;
  setPayload: (payload: AuthPayload | null) => void;
}

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
