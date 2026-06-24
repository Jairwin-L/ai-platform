'use client';

import { create } from 'zustand';
import { getCurrentUser, type AuthPayload } from '@/services/auth';
import type { UserProfile } from '@/services/users';

interface AuthSessionState {
  currentUserProfile: UserProfile | null;
  isLoading: boolean;
  isReady: boolean;
  payload: AuthPayload | null;
  clearSession: () => void;
  loadSession: () => Promise<void>;
  setCurrentUserProfile: (profile: UserProfile) => void;
  setPayload: (payload: AuthPayload | null) => void;
}

let loadSessionPromise: Promise<void> | null = null;
let sessionVersion = 0;

export const useAuthSessionStore = create<AuthSessionState>((set, get) => ({
  currentUserProfile: null,
  isLoading: false,
  isReady: false,
  payload: null,
  clearSession: () => {
    sessionVersion += 1;
    set({ currentUserProfile: null, isLoading: false, isReady: true, payload: null });
  },
  loadSession: async () => {
    if (get().isReady) {
      return;
    }

    if (loadSessionPromise) {
      return loadSessionPromise;
    }

    set({ isLoading: true });
    const requestVersion = sessionVersion;
    loadSessionPromise = (async () => {
      try {
        const payload = await getCurrentUser();
        if (requestVersion === sessionVersion) {
          set({ payload });
        }
      } catch {
        if (requestVersion === sessionVersion) {
          set({ currentUserProfile: null, payload: null });
        }
      } finally {
        if (requestVersion === sessionVersion) {
          set({ isLoading: false, isReady: true });
        }
      }
    })();

    try {
      await loadSessionPromise;
    } finally {
      loadSessionPromise = null;
    }
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
    sessionVersion += 1;
    set({
      currentUserProfile: null,
      isLoading: false,
      isReady: true,
      payload,
    });
  },
}));
