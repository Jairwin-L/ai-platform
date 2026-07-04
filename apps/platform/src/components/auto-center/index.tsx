import styles from './index.module.scss';

export default function AutoCenter(props: IComponent.AutoCenterProps) {
  const { children, className } = props;
  const rootClassName = [styles.root, className].filter(Boolean).join(' ');

  return <div className={rootClassName}>{children}</div>;
}
