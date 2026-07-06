'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Dropdown, Skeleton } from 'antd';
import type { MenuProps } from 'antd';
import { usePermission } from '@/hooks/use-permission';
import { signOut } from '@/api/modules/auth';
import type { AuthUser } from '@/api/modules/auth';
import styles from './index.module.scss';

function getDisplayName(user: AuthUser | null): string {
  return user?.nickName || user?.email || '我的账号';
}

function getAvatarText(user: AuthUser | null): string {
  const displayName = getDisplayName(user);
  return displayName.trim().charAt(0).toUpperCase() || '我';
}

export function AccountMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const { clearSession, hasRole, isReady, user } = usePermission();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setAvatarFailed(false);
  }, [user?.picture]);

  function onProfileClick(): void {
    if (user?.id && pathname.startsWith('/account')) return;
    router.push(`/account/${user?.id}`);
  }

  function onSignInClick(): void {
    router.push('/sign-in');
  }

  async function signOutCurrentUser(): Promise<void> {
    setSigningOut(true);

    try {
      await signOut();
      clearSession();
      router.push('/sign-in');
      router.refresh();
    } catch {
      // Request errors are surfaced by alova.
    } finally {
      setSigningOut(false);
    }
  }

  function onMenuClick({ key }: { key: string }): void {
    if (key === 'ACCOUNT') {
      onProfileClick();
      return;
    }

    if (key === 'AI_SETTING') {
      router.push('/account/setting/ai');
      return;
    }

    if (key === 'THIRD_PARTY_SERVICE') {
      router.push('/account/setting/THIRD_PARTY_SERVICE');
      return;
    }

    if (key === 'admin') {
      router.push('/admin');
      return;
    }

    if (key === 'SIGN_OUT') {
      signOutCurrentUser();
    }
  }

  const displayName = getDisplayName(user);
  const shouldShowAvatarImage = Boolean(user?.picture && !avatarFailed);
  const menuItems: MenuProps['items'] = [
    { key: 'ACCOUNT', label: '我的账户' },
    { key: 'AI_SETTING', label: 'AI 密钥' },
    { key: 'THIRD_PARTY_SERVICE', label: '第三方服务凭据' },
    { type: 'divider' },
    ...(hasRole('admin') ? [{ key: 'admin', label: '管理系统' }] : []),
    { type: 'divider' },
    {
      key: 'SIGN_OUT',
      disabled: signingOut,
      danger: true,
      label: signingOut ? '退出中...' : '退出登录',
    },
  ];

  if (!isReady) {
    return (
      <div aria-label="正在加载账户菜单" className={styles['trigger-skeleton']} role="status">
        <Skeleton.Avatar active size={28} />
        <Skeleton.Input active className={styles['skeleton-name']} size="small" />
      </div>
    );
  }

  if (!user) {
    return (
      <button className={styles['sign-in-button']} type="button" onClick={onSignInClick}>
        登录
      </button>
    );
  }

  return (
    <Dropdown
      classNames={{ root: styles['menu-panel'] }}
      menu={{ items: menuItems, onClick: onMenuClick }}
      onOpenChange={setMenuOpen}
      open={menuOpen}
      placement="bottomRight"
      trigger={['click']}
    >
      <button className={styles.trigger} data-open={menuOpen} type="button">
        <span className={styles.avatar} aria-hidden="true">
          {shouldShowAvatarImage ? (
            <img
              alt=""
              className={styles.image}
              src={user?.picture ?? undefined}
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            getAvatarText(user)
          )}
        </span>
        <span className={styles.nickname}>{displayName}</span>
      </button>
    </Dropdown>
  );
}
