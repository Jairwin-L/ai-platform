import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { getAuthUserBySessionToken, getSessionCookieName } from '@/lib/server/auth-session';
import { getUserProfile } from '@/lib/server/user-profile';
import { AccountProfileContent } from './account-profile-content';

type AccountPageProps = IAppPages.AccountPageProps;

async function getCurrentUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  const user = await getAuthUserBySessionToken(token);

  return user?.userId;
}

export default async function Page({ params }: AccountPageProps) {
  const { id } = await params;
  if (!id) {
    notFound();
  }
  const currentUserId = await getCurrentUserId();
  const profile = await getUserProfile(id, currentUserId);

  if (!profile) {
    notFound();
  }

  return <AccountProfileContent profile={profile} />;
}
