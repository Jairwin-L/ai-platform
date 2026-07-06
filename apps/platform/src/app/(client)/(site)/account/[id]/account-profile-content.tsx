'use client';

import { useEffect } from 'react';
import { Typography } from 'antd';
import { useAuthSessionStore } from '@/stores/auth-session';
import type { UserProfile } from '@/api/modules/users';
import { AccountProfileForm } from './account-profile-form';
import styles from './page.module.scss';

function getDisplayName(profile: UserProfile): string {
  return profile.nick_name || '未设置昵称';
}

function getAvatarName(profile: UserProfile): string {
  return profile.nick_name || profile.email || profile.full_name || profile.user_name || profile.id;
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
  const avatarName = getAvatarName(displayedProfile);
  const profileEmail = displayedProfile.email || '未设置邮箱';

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
              getInitials(avatarName)
            )}
          </div>
          <div className={styles.identity}>
            <div className={styles['title-row']}>
              <h1 className={styles.title}>{displayName}</h1>
              {profile.is_me ? <span className={styles.badge}>我自己</span> : null}
            </div>
            <Typography.Text
              className={styles.email}
              copyable={
                displayedProfile.email
                  ? { text: displayedProfile.email, tooltips: ['复制邮箱', '已复制'] }
                  : false
              }
            >
              {profileEmail}
            </Typography.Text>
            <p className={styles.bio}>{displayedProfile.bio || '这个用户还没有填写个人简介。'}</p>
          </div>
        </header>

        {profile.is_me ? <AccountProfileForm profile={displayedProfile} /> : null}
      </section>
    </main>
  );
}
