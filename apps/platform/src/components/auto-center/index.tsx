import { type ReactNode } from 'react';

interface IAutoCenter {
  children: ReactNode;
  className?: string;
}

export default function AutoCenter(props: IAutoCenter) {
  const { children, className } = props;
  return (
    <div className={`flex items-center justify-center h-screen ${className || ''}`}>{children}</div>
  );
}
