import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getAuthUserBySessionToken, getSessionCookieName } from '@/lib/server/auth-session';
import { getUserProfile } from '@/lib/server/user-profile';
import styles from './page.module.scss';

interface AccountPageProps {
  params: Promise<{
    id?: string;
  }>;
}

function getDisplayName(profile: Awaited<ReturnType<typeof getUserProfile>>) {
  if (!profile) {
    return '';
  }

  return profile.nick_name || profile.full_name || profile.user_name || profile.email || profile.id;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return '未记录';
  }

  return new Date(value).toLocaleString('zh-CN', {
    hour12: false,
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function getInitials(name: string) {
  return name.trim().slice(0, 2).toUpperCase();
}

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

  if (id === 'me') {
    if (!currentUserId) {
      redirect('/sign-in');
    }

    redirect(`/account/${currentUserId}`);
  }

  const profile = await getUserProfile(id, currentUserId);

  if (!profile) {
    notFound();
  }

  const displayName = getDisplayName(profile);

  return (
    <main className={styles.page}>
      <section className={styles.container}>
        <header className={styles.hero}>
          <div className={styles.avatar} aria-hidden="true">
            {profile.picture ? (
              <span
                className={styles.picture}
                style={{ backgroundImage: `url(${profile.picture})` }}
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
              {profile.user_name ? `@${profile.user_name}` : profile.email || profile.id}
            </p>
            <p className={styles.bio}>{profile.bio || '这个用户还没有填写个人简介。'}</p>
          </div>
        </header>

        <section className={styles.panel}>
          <h2 className={styles['panel-title']}>基础信息</h2>
          <dl className={styles.details}>
            <div>
              <dt>用户 ID</dt>
              <dd>{profile.id}</dd>
            </div>
            <div>
              <dt>邮箱</dt>
              <dd>{profile.email || '未填写'}</dd>
            </div>
            <div>
              <dt>邮箱验证</dt>
              <dd>{profile.email_verified ? '已验证' : '未验证'}</dd>
            </div>
            <div>
              <dt>状态</dt>
              <dd>{profile.status}</dd>
            </div>
            <div>
              <dt>最近登录</dt>
              <dd>{formatDateTime(profile.last_login_at)}</dd>
            </div>
            <div>
              <dt>创建时间</dt>
              <dd>{formatDateTime(profile.created_at)}</dd>
            </div>
            <div>
              <dt>更新时间</dt>
              <dd>{formatDateTime(profile.updated_at)}</dd>
            </div>
          </dl>
        </section>
      </section>
    </main>
  );
}
