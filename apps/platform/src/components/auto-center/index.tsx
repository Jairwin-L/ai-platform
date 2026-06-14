import { type ReactNode } from 'react';
import styles from './index.module.scss';

interface IAutoCenter {
  children: ReactNode;
  className?: string;
}

export default function AutoCenter(props: IAutoCenter) {
  const { children, className } = props;
  const rootClassName = [styles.root, className].filter(Boolean).join(' ');

  return <div className={rootClassName}>{children}</div>;
}
