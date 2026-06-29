import type { ReactNode } from 'react';

export default async function AuthLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return <>{children}</>;
}
