'use client';

import { useCallback, useEffect, useState } from 'react';
import { getCurrentUser, type AuthPayload, type AuthUser } from '@/services/auth';

export type PermissionCode = string;

interface PermissionResult {
  isLoading: boolean;
  isReady: boolean;
  user: AuthUser | null;
  hasPermission: (code: PermissionCode) => boolean;
  hasAnyPermission: (codes: PermissionCode[]) => boolean;
  hasAllPermissions: (codes: PermissionCode[]) => boolean;
  hasRole: (role: string) => boolean;
}

/**
 * Loads the current session's roles and permission codes for client-side display decisions.
 * Server-side authorization must still be enforced by the corresponding route or API handler.
 */
export function usePermission(): PermissionResult {
  const [payload, setPayload] = useState<AuthPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function fetchPermissions(): Promise<void> {
      try {
        const currentUser = await getCurrentUser();

        if (!ignore) {
          setPayload(currentUser);
        }
      } catch {
        if (!ignore) {
          setPayload(null);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
          setIsReady(true);
        }
      }
    }

    fetchPermissions();

    return () => {
      ignore = true;
    };
  }, []);

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
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
  };
}
