import Link from 'next/link';
import { APP_BLACK_LOGO, APP_NAME } from '@/constants';
import { AccountMenu } from './components/account-menu';
import { AiMenu } from './components/ai-menu';
import { EditorMenu } from './components/editor-menu';
import { SiteNavLink } from './components/site-nav-link';
import styles from './index.module.scss';

export default async function SiteLayout({ children }: Readonly<IComponent.ChildrenProps>) {
  return (
    <>
      <header className={styles['site-header']}>
        <nav className={styles.nav} aria-label="站点导航">
          <Link className={styles.brand} href="/">
            <img alt={APP_NAME} className={styles.logo} src={APP_BLACK_LOGO} />
            <span>{APP_NAME}</span>
          </Link>
          <div className={styles.links}>
            <AiMenu />
            <EditorMenu />
            <SiteNavLink href="/articles" matchPrefix="/articles">
              文章
            </SiteNavLink>
            <SiteNavLink href="/upload" matchPrefix="/upload">
              上传
            </SiteNavLink>
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
