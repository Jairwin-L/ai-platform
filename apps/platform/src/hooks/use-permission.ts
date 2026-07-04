'use client';

import { useCallback } from 'react';
import { useAuthSessionStore } from '@/stores/auth-session';

export type PermissionCode = IHooks.PermissionCode;

/**
 * Reads the global session's roles and permission codes for client-side display decisions.
 * Server-side authorization must still be enforced by the corresponding route or API handler.
 */
export function usePermission(): IHooks.PermissionResult {
  const payload = useAuthSessionStore((state) => state.payload);
  const isLoading = useAuthSessionStore((state) => state.isLoading);
  const isReady = useAuthSessionStore((state) => state.isReady);
  const clearSession = useAuthSessionStore((state) => state.clearSession);
  const setCurrentUserProfile = useAuthSessionStore((state) => state.setCurrentUserProfile);

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
