import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { type ReactNode } from 'react';
import { AdminShell } from '@/components/admin/admin-shell';
import { getAuthUserBySessionToken, getSessionCookieName } from '@/lib/server/auth-session';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  const user = await getAuthUserBySessionToken(token);

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.roles?.includes('admin')) {
    redirect('/');
  }

  return <AdminShell>{children}</AdminShell>;
}
