'use client';

import { KeyOutlined, UserOutlined } from '@ant-design/icons';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import ClientSideOnly from '@/components/client-side-only';
import { usePermission } from '@/hooks/use-permission';
import styles from './layout.module.scss';

interface AccountLayoutProps {
  children: ReactNode;
}

interface AccountNavItem {
  disabled?: boolean;
  href: string;
  icon: ReactNode;
  isActive: (pathname: string) => boolean;
  label: string;
}

function buildAccountNavItems(userId?: string): AccountNavItem[] {
  const profileHref = userId ? `/account/${userId}` : '/sign-in';

  return [
    {
      disabled: !userId,
      href: profileHref,
      icon: <UserOutlined />,
      isActive: (pathname) =>
        pathname.startsWith('/account/') && !pathname.startsWith('/account/setting'),
      label: '个人资料',
    },
    {
      disabled: !userId,
      href: '/account/setting/ai',
      icon: <KeyOutlined />,
      isActive: (pathname) => pathname.startsWith('/account/setting/ai'),
      label: 'AI 密钥',
    },
  ];
}

export default function AccountLayout({ children }: AccountLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isReady, user } = usePermission();
  const navItems = buildAccountNavItems(user?.id);
  const isSettingPath = pathname.startsWith('/account/setting');

  function onGoPage(item: AccountNavItem): void {
    if (item.disabled || pathname === item.href) {
      return;
    }

    router.push(item.href);
  }

  return (
    <ClientSideOnly>
      {isReady && !user && !isSettingPath ? (
        <div className={styles['public-content']}>{children}</div>
      ) : (
        <div className={styles.shell}>
          <aside className={styles.aside}>
            <nav className={styles.nav} aria-label="账号导航">
              <ul className={styles.list}>
                {navItems.map((item) => (
                  <li className={styles.item} key={item.href}>
                    <button
                      aria-current={item.isActive(pathname) ? 'page' : undefined}
                      className={styles.button}
                      data-active={item.isActive(pathname)}
                      disabled={item.disabled}
                      type="button"
                      onClick={() => onGoPage(item)}
                    >
                      <span className={styles.icon} aria-hidden="true">
                        {item.icon}
                      </span>
                      <span className={styles.label}>{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
          <section className={styles.content}>{children}</section>
        </div>
      )}
    </ClientSideOnly>
  );
}
