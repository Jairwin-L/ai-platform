'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { APP_BLACK_LOGO, APP_NAME } from '@/constants';
import { AccountMenu } from '../account-menu';
import styles from './index.module.scss';

const AUTH_PATHNAMES = new Set(['/sign-in', '/sign-up']);

interface SiteHeaderProps {
  showAuthenticatedLinks: boolean;
}

export function SiteHeader({ showAuthenticatedLinks }: SiteHeaderProps) {
  const pathname = usePathname();

  if (AUTH_PATHNAMES.has(pathname)) {
    return null;
  }

  return (
    <header className={styles['site-header']}>
      <nav className={styles.nav} aria-label="站点导航">
        <Link className={styles.brand} href="/">
          <img alt={APP_NAME} className={styles.logo} src={APP_BLACK_LOGO} />
        </Link>
        <div className={styles.links}>
          {showAuthenticatedLinks ? (
            <>
              <Link href="/articles">文章</Link>
              <Link href="/upload">上传</Link>
            </>
          ) : null}
          <AccountMenu />
        </div>
      </nav>
    </header>
  );
}
