'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SiteNavLinkProps extends Readonly<IComponent.ChildrenProps> {
  href: string;
  matchPrefix: string;
}

export function SiteNavLink({ children, href, matchPrefix }: SiteNavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${matchPrefix}/`);

  return (
    <Link aria-current={isActive ? 'page' : undefined} data-active={isActive} href={href}>
      {children}
    </Link>
  );
}
