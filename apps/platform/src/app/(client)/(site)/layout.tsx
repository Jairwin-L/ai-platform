import { cookies } from 'next/headers';
import { getAuthUserBySessionToken, getSessionCookieName } from '@/lib/server/auth-session';
import Link from 'next/link';
import { APP_BLACK_LOGO, APP_NAME } from '@/constants';
import { AccountMenu } from './components/account-menu';
import styles from './index.module.scss';

export default async function SiteLayout({ children }: Readonly<IComponent.ChildrenProps>) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  const user = await getAuthUserBySessionToken(token);

  return (
    <>
      <header className={styles['site-header']}>
        <nav className={styles.nav} aria-label="站点导航">
          <Link className={styles.brand} href="/">
            <img alt={APP_NAME} className={styles.logo} src={APP_BLACK_LOGO} />
            <span>{APP_NAME}</span>
          </Link>
          <div className={styles.links}>
            {user ? (
              <>
                <Link href="/articles">文章</Link>
                <Link href="/upload">上传</Link>
              </>
            ) : null}
          </div>
          <div className={styles['site-actions']}>
            <AccountMenu />
          </div>
        </nav>
      </header>
      <main className={styles['site-main-container']}>{children}</main>
    </>
  );
}
