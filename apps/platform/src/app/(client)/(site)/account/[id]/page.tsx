import { notFound } from 'next/navigation';
import { fetchPlatformApi } from '@/api/server';
import type { UserProfile } from '@/api/modules/users';
import { AccountProfileContent } from './account-profile-content';

export default async function Page({ params }: IAppPages.AccountPageProps) {
  const { id } = await params;
  if (!id) {
    notFound();
  }

  const profile = await fetchPlatformApi<UserProfile>(`/users/${encodeURIComponent(id)}`);

  if (!profile) {
    notFound();
  }

  return <AccountProfileContent profile={profile} />;
}
