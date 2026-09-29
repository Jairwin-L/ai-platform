import { SITE_LOGO_URL, SITE_NAME, VITE_ENV } from '@/constants';
import css from './index.module.scss';

interface LogoProps {
  collapsed: boolean;
}

export default function Logo({ collapsed }: LogoProps) {
  return (
    <div className={css['logo-box']}>
      <img src={SITE_LOGO_URL} alt="logo" className={css['logo-img']} />
      {collapsed ? null : (
        <span className={css['logo-text']}>{VITE_ENV.VITE_APP_TITLE || SITE_NAME}</span>
      )}
    </div>
  );
}
