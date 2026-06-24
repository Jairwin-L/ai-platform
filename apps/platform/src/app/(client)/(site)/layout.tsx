import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { getAuthUserBySessionToken, getSessionCookieName } from '@/lib/server/auth-session';
import { SiteHeader } from './components/site-header';

export default async function SiteLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  const user = await getAuthUserBySessionToken(token);

  return (
    <>
      <SiteHeader showAuthenticatedLinks={Boolean(user)} />
      {children}
    </>
  );
}
