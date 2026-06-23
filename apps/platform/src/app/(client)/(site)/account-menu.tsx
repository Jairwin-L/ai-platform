'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { usePermission } from '@/hooks/use-permission';
import { signOut } from '@/services/auth';
import type { AuthUser } from '@/services/auth';
import styles from './account-menu.module.scss';

function getDisplayName(user: AuthUser | null): string {
  return user?.nickName || user?.email || '我的账号';
}

function getAvatarText(user: AuthUser | null): string {
  const displayName = getDisplayName(user);
  return displayName.trim().charAt(0).toUpperCase() || '我';
}

export function AccountMenu() {
  const router = useRouter();
  const { hasRole, user } = usePermission();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setAvatarFailed(false);
  }, [user?.picture]);

  function onProfileClick(): void {
    router.push('/');
  }

  async function signOutCurrentUser(): Promise<void> {
    setSigningOut(true);

    try {
      await signOut();
      router.push('/sign-in');
      router.refresh();
    } catch {
      // Request errors are surfaced by alova.
    } finally {
      setSigningOut(false);
    }
  }

  function onMenuClick({ key }: { key: string }): void {
    if (key === 'profile') {
      onProfileClick();
      return;
    }

    if (key === 'admin') {
      router.push('/admin');
      return;
    }

    if (key === 'sign-out') {
      signOutCurrentUser();
    }
  }

  const displayName = getDisplayName(user);
  const shouldShowAvatarImage = Boolean(user?.picture && !avatarFailed);
  const menuItems: MenuProps['items'] = [
    { key: 'profile', label: '我的资料' },
    ...(hasRole('admin') ? [{ key: 'admin', label: '管理系统' }] : []),
    { key: 'sign-out', disabled: signingOut, label: signingOut ? '退出中...' : '退出登录' },
  ];

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
