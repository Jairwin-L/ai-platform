'use client';

import { useCallback, useEffect } from 'react';
import type { AuthUser } from '@/services/auth';
import { useAuthSessionStore } from '@/stores/auth-session';
import type { UserProfile } from '@/services/users';

export type PermissionCode = string;

interface PermissionResult {
  isLoading: boolean;
  isReady: boolean;
  user: AuthUser | null;
  clearSession: () => void;
  hasPermission: (code: PermissionCode) => boolean;
  hasAnyPermission: (codes: PermissionCode[]) => boolean;
  hasAllPermissions: (codes: PermissionCode[]) => boolean;
  hasRole: (role: string) => boolean;
  setCurrentUserProfile: (profile: UserProfile) => void;
}

/**
 * Reads the global session's roles and permission codes for client-side display decisions.
 * Server-side authorization must still be enforced by the corresponding route or API handler.
 */
export function usePermission(): PermissionResult {
  const payload = useAuthSessionStore((state) => state.payload);
  const isLoading = useAuthSessionStore((state) => state.isLoading);
  const isReady = useAuthSessionStore((state) => state.isReady);
  const loadSession = useAuthSessionStore((state) => state.loadSession);
  const clearSession = useAuthSessionStore((state) => state.clearSession);
  const setCurrentUserProfile = useAuthSessionStore((state) => state.setCurrentUserProfile);

  useEffect(() => {
    loadSession().catch(() => undefined);
  }, [loadSession]);

  const hasPermission = useCallback(
    (code: PermissionCode): boolean => isReady && (payload?.permissions.includes(code) ?? false),
    [isReady, payload?.permissions],
  );

  const hasAnyPermission = useCallback(
    (codes: PermissionCode[]): boolean => codes.some((code) => hasPermission(code)),
    [hasPermission],
  );

  const hasAllPermissions = useCallback(
    (codes: PermissionCode[]): boolean => codes.every((code) => hasPermission(code)),
    [hasPermission],
  );

  const hasRole = useCallback(
    (role: string): boolean => isReady && (payload?.roles.includes(role) ?? false),
    [isReady, payload?.roles],
  );

  return {
    user: payload?.user ?? null,
    isLoading,
    isReady,
    clearSession,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    setCurrentUserProfile,
  };
}
