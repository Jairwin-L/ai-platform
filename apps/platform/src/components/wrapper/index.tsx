'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { usePermission } from '@/hooks/use-permission';
import { useAuthSessionStore } from '@/stores/auth-session';
import ClientSideOnly from '../client-side-only';
import Loading from '../loading';

const AUTHENTICATED_PATHS = ['/account/setting', '/articles', '/upload'];
const ADMIN_PATH = '/admin';

function requiresAuthentication(pathname: string): boolean {
  return AUTHENTICATED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isAdminPath(pathname: string): boolean {
  return pathname === ADMIN_PATH || pathname.startsWith(`${ADMIN_PATH}/`);
}

type WrapperProps = IComponent.WrapperProps;

export default function Wrapper({ children, initialAuthPayload }: WrapperProps) {
  const pathname = usePathname();
  const router = useRouter();
  const setPayload = useAuthSessionStore((state) => state.setPayload);
  const { isReady, user } = usePermission();
  const requiresAuth = requiresAuthentication(pathname);

  useEffect(() => {
    setPayload(initialAuthPayload);
  }, [initialAuthPayload, setPayload]);

  useEffect(() => {
    if (requiresAuth && isReady && !user) {
      router.replace('/sign-in');
    }
  }, [isReady, requiresAuth, router, user]);

  if (requiresAuth) {
    if (!isReady || !user) {
      return <Loading />;
    }

    return children;
  }

  if (isAdminPath(pathname)) {
    return <ClientSideOnly>{children}</ClientSideOnly>;
  }

  return children;
}
