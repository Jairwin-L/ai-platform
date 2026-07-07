import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { AntdProvider, Wrapper } from '@/components';
import { APP_NAME } from '@/constants';
import { getAuthPayloadBySessionToken, getSessionCookieName } from '@/lib/server/auth-session';
import 'antd/dist/reset.css';
import '@/styles/globals.scss';

const APP_DESCRIPTION =
  'A production-ready Next.js App Router starter kit with React, TypeScript, Ant Design, alova, Prisma, OpenAPI, and Docker deployment.';
const APP_URL = new URL('https://nextjs-starter-kit.jairwin.cc');
const APP_PREVIEW_IMAGE = {
  url: '/logo-black.png',
  width: 1254,
  height: 1254,
  alt: APP_NAME,
};

export const metadata: Metadata = {
  metadataBase: APP_URL,
  applicationName: APP_NAME,
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  keywords: [
    'Next.js',
    'React',
    'TypeScript',
    'Ant Design',
    'alova',
    'Prisma',
    'OpenAPI',
    'Docker',
  ],
  authors: [{ name: 'Jairwin', url: 'https://github.com/Jairwin-L' }],
  creator: 'Jairwin',
  publisher: 'Jairwin',
  referrer: 'origin-when-cross-origin',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: APP_NAME,
    title: APP_NAME,
    description: APP_DESCRIPTION,
    locale: 'en_US',
    images: [APP_PREVIEW_IMAGE],
  },
  twitter: {
    card: 'summary',
    title: APP_NAME,
    description: APP_DESCRIPTION,
    images: [APP_PREVIEW_IMAGE],
  },
  icons: {
    icon: [
      { url: '/icon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icon/android-icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/icon/apple-icon-57x57.png', sizes: '57x57' },
      { url: '/icon/apple-icon-60x60.png', sizes: '60x60' },
      { url: '/icon/apple-icon-72x72.png', sizes: '72x72' },
      { url: '/icon/apple-icon-76x76.png', sizes: '76x76' },
      { url: '/icon/apple-icon-114x114.png', sizes: '114x114' },
      { url: '/icon/apple-icon-120x120.png', sizes: '120x120' },
      { url: '/icon/apple-icon-144x144.png', sizes: '144x144' },
      { url: '/icon/apple-icon-152x152.png', sizes: '152x152' },
      { url: '/icon/apple-icon-180x180.png', sizes: '180x180' },
    ],
  },
  manifest: '/icon/manifest.json',
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: 'default',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'msapplication-TileColor': '#fff',
    'msapplication-TileImage': '/icon/ms-icon-144x144.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#fff',
};

export default async function RootLayout({ children }: Readonly<IComponent.ChildrenProps>) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(getSessionCookieName())?.value;
  const initialAuthPayload = sessionToken ? await getAuthPayloadBySessionToken(sessionToken) : null;

  return (
    <html lang="en">
      <head>
        <meta httpEquiv="X-UA-Compatible" content="IE=Edge,chrome=1" />
      </head>
      <body className="app-body">
        <AntdRegistry>
          <AntdProvider>
            <Wrapper initialAuthPayload={initialAuthPayload}>{children}</Wrapper>
          </AntdProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
