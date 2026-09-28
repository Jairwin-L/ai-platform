'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Dropdown, Skeleton } from 'antd';
import type { MenuProps } from 'antd';
import { signOut } from '@/api/modules/auth';
import type { AuthUser } from '@/api/modules/auth';
import { ADMIN_ROLE_CODES } from '@ai/constants';
import { useDebounced } from '@/hooks/use-debounced';
import { usePermission } from '@/hooks/use-permission';
import styles from './index.module.scss';

/**
 * 管理后台是独立部署的站点（apps/admin），地址在构建期注入；
 * 未配置时不显示入口。真正的访问控制在 db-service 的 admin 会话上。
 */
const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL?.trim();

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
  const debouncedSignOutCurrentUser = useDebounced(signOutCurrentUser, 300);

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

    if (key === 'ADMIN_PANEL' && ADMIN_URL) {
      window.open(ADMIN_URL, '_blank', 'noopener,noreferrer');
      return;
    }

    if (key === 'SIGN_OUT') {
      debouncedSignOutCurrentUser();
    }
  }

  const displayName = getDisplayName(user);
  const shouldShowAvatarImage = Boolean(user?.picture && !avatarFailed);
  const canOpenAdmin = Boolean(ADMIN_URL) && ADMIN_ROLE_CODES.some((role) => hasRole(role));
  const menuItems: MenuProps['items'] = [
    { key: 'ACCOUNT', label: '我的账户' },
    { key: 'AI_SETTING', label: 'AI 密钥' },
    { key: 'THIRD_PARTY_SERVICE', label: '第三方服务凭据' },
    { type: 'divider' },
    ...(canOpenAdmin ? [{ key: 'ADMIN_PANEL', label: '管理系统' }] : []),
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
