'use client';

import { useAuthSessionStore } from '@/stores/auth-session';

/**
 * Reads the global platform session for client-side display decisions.
 * Platform users have no roles or permission codes; admin RBAC lives in apps/admin.
 */
export function usePermission(): IHooks.PermissionResult {
  const payload = useAuthSessionStore((state) => state.payload);
  const isLoading = useAuthSessionStore((state) => state.isLoading);
  const isReady = useAuthSessionStore((state) => state.isReady);
  const clearSession = useAuthSessionStore((state) => state.clearSession);
  const setCurrentUserProfile = useAuthSessionStore((state) => state.setCurrentUserProfile);

  return {
    user: payload?.user ?? null,
    isLoading,
    isReady,
    clearSession,
    setCurrentUserProfile,
  };
}
