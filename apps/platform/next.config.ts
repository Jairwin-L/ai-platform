import type { NextConfig } from 'next';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

const REMOTE_PATTERNS = [
  {
    protocol: 'https',
    hostname: 'nextjs-starter-kit.jairwin.cc',
    port: '',
    pathname: '/**',
  },
] satisfies NonNullable<NonNullable<NextConfig['images']>['remotePatterns']>;

function buildContentSecurityPolicy(): string {
  const directives: string[][] = [
    ['default-src', "'self'"],
    ['base-uri', "'self'"],
    ['form-action', "'self'"],
    ['frame-ancestors', "'none'"],
    ['object-src', "'none'"],
    [
      'script-src',
      "'self'",
      "'unsafe-inline'",
      'https://static.cloudflareinsights.com',
      "'unsafe-eval'",
    ],
    ['style-src', "'self'", "'unsafe-inline'"],
    ['img-src', "'self'", 'data:', 'blob:', 'https:'],
    ['font-src', "'self'", 'data:'],
    ['connect-src', "'self'", 'https:', 'https://cloudflareinsights.com', 'http:', 'ws:', 'wss:'],
    ['media-src', "'self'", 'data:', 'blob:'],
    ['manifest-src', "'self'"],
    ['worker-src', "'self'", 'blob:'],
  ];

  return directives.map((directive) => directive.join(' ')).join('; ');
}

const nextConfig: NextConfig = {
  output: 'standalone',
  // OpenNext's file tracer does not include pg-cloudflare's workerd entry by default.
  outputFileTracingIncludes: {
    '**/*': ['./node_modules/pg-cloudflare/dist/**', './node_modules/pg-cloudflare/esm/**'],
  },
  sassOptions: {
    loadPaths: [root],
    additionalData: [
      '@import "src/styles/variable.scss";',
      '@import "src/styles/mixins.scss";',
    ].join('\n'),
    charset: false,
    silenceDeprecations: ['import', 'legacy-js-api'],
  },
  images: {
    remotePatterns: REMOTE_PATTERNS,
  },
  turbopack: {
    root,
  },
  // TODO:
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: buildContentSecurityPolicy(),
          },
        ],
      },
    ];
  },
};

export default nextConfig;

// import('@opennextjs/cloudflare').then(({ initOpenNextCloudflareForDev }) => {
//   initOpenNextCloudflareForDev();
// });
