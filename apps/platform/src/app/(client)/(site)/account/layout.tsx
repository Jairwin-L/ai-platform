'use client';

import { ApiOutlined, KeyOutlined, UserOutlined } from '@ant-design/icons';
import { usePathname, useRouter } from 'next/navigation';
import ClientSideOnly from '@/components/client-side-only';
import { usePermission } from '@/hooks/use-permission';
import styles from './layout.module.scss';

function buildAccountNavItems(userId?: string): IAppPages.AccountNavItem[] {
  const profileHref = userId ? `/account/${userId}` : '/sign-in';

  return [
    {
      disabled: !userId,
      href: profileHref,
      icon: <UserOutlined />,
      isActive: (pathname) =>
        pathname.startsWith('/account/') && !pathname.startsWith('/account/setting'),
      label: '我的账户',
    },
    {
      disabled: !userId,
      href: '/account/setting/ai',
      icon: <KeyOutlined />,
      isActive: (pathname) => pathname.startsWith('/account/setting/ai'),
      label: 'AI 密钥',
    },
    {
      disabled: !userId,
      href: '/account/setting/third-party-service',
      icon: <ApiOutlined />,
      isActive: (pathname) => pathname.startsWith('/account/setting/third-party-service'),
      label: '第三方服务凭据',
    },
  ];
}

export default function AccountLayout({ children }: IAppPages.AccountLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isReady, user } = usePermission();
  const navItems = buildAccountNavItems(user?.id);
  const isSettingPath = pathname.startsWith('/account/setting');

  function onGoPage(item: IAppPages.AccountNavItem): void {
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
