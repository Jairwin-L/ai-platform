'use client';
import { AutoCenter } from '@/components';
import { redirect } from 'next/navigation';
import styles from './not-found.module.scss';

export default function NotFound() {
  const onGoBack = () => {
    redirect('/');
  };
  return (
    <AutoCenter className={styles.center}>
      <p className={styles.message}>抱歉，你访问的页面不存在。</p>
      <button className={styles.action} onClick={onGoBack}>
        返回主页
      </button>
    </AutoCenter>
  );
}
