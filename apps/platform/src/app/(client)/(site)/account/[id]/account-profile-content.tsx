'use client';

import { useEffect } from 'react';
import { useAuthSessionStore } from '@/stores/auth-session';
import type { UserProfile } from '@/api/modules/users';
import { AccountProfileForm } from './account-profile-form';
import styles from './page.module.scss';

function getDisplayName(profile: UserProfile): string {
  return profile.nick_name || profile.full_name || profile.user_name || profile.email || profile.id;
}

function getProfileSubtitle(profile: UserProfile): string | null {
  if (profile.user_name) {
    return `@${profile.user_name}`;
  }

  if (profile.is_me) {
    return profile.email || profile.id;
  }

  return null;
}

function getInitials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase();
}

export function AccountProfileContent({ profile }: IAppPages.AccountProfileContentProps) {
  const currentUserProfile = useAuthSessionStore((state) => state.currentUserProfile);
  const setCurrentUserProfile = useAuthSessionStore((state) => state.setCurrentUserProfile);

  useEffect(() => {
    if (profile.is_me) {
      setCurrentUserProfile(profile);
    }
  }, [profile, setCurrentUserProfile]);

  const displayedProfile =
    profile.is_me && currentUserProfile?.id === profile.id ? currentUserProfile : profile;
  const displayName = getDisplayName(displayedProfile);
  const profileSubtitle = getProfileSubtitle(displayedProfile);

  return (
    <main className={styles.page}>
      <section className={styles.container}>
        <header className={styles.hero}>
          <div className={styles.avatar} aria-hidden="true">
            {displayedProfile.picture ? (
              <span
                className={styles.picture}
                style={{ backgroundImage: `url(${displayedProfile.picture})` }}
              />
            ) : (
              getInitials(displayName)
            )}
          </div>
          <div className={styles.identity}>
            <div className={styles['title-row']}>
              <h1 className={styles.title}>{displayName}</h1>
              {profile.is_me ? <span className={styles.badge}>我自己</span> : null}
            </div>
            {profileSubtitle ? <p className={styles.subtitle}>{profileSubtitle}</p> : null}
            <p className={styles.bio}>{displayedProfile.bio || '这个用户还没有填写个人简介。'}</p>
          </div>
        </header>

        {profile.is_me ? <AccountProfileForm profile={displayedProfile} /> : null}
      </section>
    </main>
  );
}
