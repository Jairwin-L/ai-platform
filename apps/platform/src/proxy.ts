import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_SESSION_COOKIE_NAME } from '@/constants/auth';

const LOGIN_PATH = '/sign-in';
const PROTECTED_PATHS = ['/admin', '/ai', '/articles', '/upload'];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.has(AUTH_SESSION_COOKIE_NAME);

  if (hasSession) {
    return NextResponse.next();
  }

  const loginUrl = new URL(LOGIN_PATH, request.url);
  loginUrl.searchParams.set('redirectUrl', `${pathname}${request.nextUrl.search}`);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/ai/:path*',
    '/articles/:path*',
    '/upload/:path*',
    '/account',
    '/account/:path*',
  ],
};
