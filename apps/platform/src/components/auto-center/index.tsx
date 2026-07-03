import styles from './index.module.scss';

type AutoCenterProps = IComponent.AutoCenterProps;

export default function AutoCenter(props: AutoCenterProps) {
  const { children, className } = props;
  const rootClassName = [styles.root, className].filter(Boolean).join(' ');

  return <div className={rootClassName}>{children}</div>;
}
