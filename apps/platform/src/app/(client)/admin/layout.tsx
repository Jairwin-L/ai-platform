import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/app/(client)/admin/components/admin-shell';
import { ADMIN_ROLE_CODES } from '@/constants';
import { getAuthUserBySessionToken, getSessionCookieName } from '@/lib/server/auth-session';

type AdminRoleCode = (typeof ADMIN_ROLE_CODES)[number];

function isAdminRole(role: string): boolean {
  return ADMIN_ROLE_CODES.includes(role as AdminRoleCode);
}

export default async function AdminLayout({ children }: IComponent.ChildrenProps) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  const user = await getAuthUserBySessionToken(token);

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.roles?.some(isAdminRole)) {
    redirect('/');
  }

  return <AdminShell>{children}</AdminShell>;
}
