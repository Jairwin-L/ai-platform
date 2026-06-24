import type { ReactNode } from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { APP_NAME } from '@/constants';
import { getAuthUserBySessionToken, getSessionCookieName } from '@/lib/server/auth-session';
import { AccountMenu } from './account-menu';
import styles from './layout.module.scss';

export default async function SiteLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  const user = await getAuthUserBySessionToken(token);

  return (
    <>
      <header className={styles['site-header']}>
        <nav className={styles.nav} aria-label="站点导航">
          <Link className={styles.brand} href="/">
            {APP_NAME}
          </Link>
          <div className={styles.links}>
            {user ? (
              <>
                <Link href="/articles">文章</Link>
                <Link href="/upload">上传</Link>
              </>
            ) : null}
            <AccountMenu />
          </div>
        </nav>
      </header>
      {children}
    </>
  );
}
