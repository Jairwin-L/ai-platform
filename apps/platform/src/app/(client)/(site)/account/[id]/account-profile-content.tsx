'use client';

import { useEffect } from 'react';
import { useAuthSessionStore } from '@/stores/auth-session';
import type { UserProfile } from '@/services/users';
import { AccountProfileForm } from './account-profile-form';
import styles from './page.module.scss';

interface AccountProfileContentProps {
  profile: UserProfile;
}

function getDisplayName(profile: UserProfile): string {
  return profile.nick_name || profile.full_name || profile.user_name || profile.email || profile.id;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return '未记录';
  }

  return new Date(value).toLocaleString('zh-CN', {
    hour12: false,
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function getInitials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase();
}

export function AccountProfileContent({ profile }: AccountProfileContentProps) {
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
            <p className={styles.subtitle}>
              {displayedProfile.user_name
                ? `@${displayedProfile.user_name}`
                : displayedProfile.email || displayedProfile.id}
            </p>
            <p className={styles.bio}>{displayedProfile.bio || '这个用户还没有填写个人简介。'}</p>
          </div>
        </header>

        <section className={styles.panel}>
          <h2 className={styles['panel-title']}>基础信息</h2>
          <dl className={styles.details}>
            <div>
              <dt>用户 ID</dt>
              <dd>{displayedProfile.id}</dd>
            </div>
            <div>
              <dt>邮箱验证</dt>
              <dd>{displayedProfile.email_verified ? '已验证' : '未验证'}</dd>
            </div>
            <div>
              <dt>状态</dt>
              <dd>{displayedProfile.status}</dd>
            </div>
            <div>
              <dt>最近登录</dt>
              <dd>{formatDateTime(displayedProfile.last_login_at)}</dd>
            </div>
            <div>
              <dt>创建时间</dt>
              <dd>{formatDateTime(displayedProfile.created_at)}</dd>
            </div>
            <div>
              <dt>更新时间</dt>
              <dd>{formatDateTime(displayedProfile.updated_at)}</dd>
            </div>
          </dl>
        </section>

        {profile.is_me ? <AccountProfileForm profile={displayedProfile} /> : null}
      </section>
    </main>
  );
}
