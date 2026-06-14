'use client';
import { AutoCenter } from '@/components';
import styles from './global-error.module.scss';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <AutoCenter className={styles.center}>
          <h2 className={styles.title}>出错了</h2>
          <p className={styles.description}>很抱歉，应用运行时出现了问题。</p>
          <p className={styles.detail}>{error.message}</p>
          <p className={styles.detail}>{error.digest}</p>
          <button className={styles.action} onClick={() => reset()}>
            重试
          </button>
        </AutoCenter>
      </body>
    </html>
  );
}
