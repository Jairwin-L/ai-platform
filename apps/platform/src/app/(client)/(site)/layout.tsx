import type { ReactNode } from 'react';
import Link from 'next/link';
import { APP_NAME } from '@/constants';
import { AccountMenu } from './account-menu';
import styles from './layout.module.scss';

export default function SiteLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <>
      <header className={styles['site-header']}>
        <nav className={styles.nav} aria-label="站点导航">
          <Link className={styles.brand} href="/">
            {APP_NAME}
          </Link>
          <div className={styles.links}>
            <Link href="/articles">文章</Link>
            <Link href="/upload">上传</Link>
            <AccountMenu />
          </div>
        </nav>
      </header>
      {children}
    </>
  );
}
