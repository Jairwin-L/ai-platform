import type { ReactNode } from 'react';
import css from './index.module.scss';

interface AutoCenterProps {
  children: ReactNode;
  className?: string;
}

export default function AutoCenter({ children, className }: AutoCenterProps) {
  const containerClassName = className
    ? `${css['center-container']} ${className}`
    : css['center-container'];
  return <div className={containerClassName}>{children}</div>;
}
