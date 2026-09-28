import type { NextConfig } from 'next';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
// pnpm workspace root: dependencies are hoisted into <workspace>/node_modules/.pnpm,
// so Turbopack and output file tracing must be able to reach it.
const workspaceRoot = resolve(root, '../..');

const REMOTE_PATTERNS = [
  {
    protocol: 'https',
    hostname: 'nextjs-starter-kit.jairwin.cc',
    port: '',
    pathname: '/**',
  },
] satisfies NonNullable<NonNullable<NextConfig['images']>['remotePatterns']>;

/** 浏览器端接口的同源前缀：alova baseURL 与 fetch 字面量都用它 */
const API_PROXY_PREFIX = '/api';
/**
 * db-service 上的通用接口只挂根路径（不带 platform/ 命名空间），转发时去掉同源前缀；
 * 其余前台接口转发到 db-service 的 `platform/` 命名空间下。
 */
const COMMON_API_PREFIXES = ['/upload', '/compress'];

/**
 * 浏览器端接口的转发目标（db-service 的内网地址）。
 *
 * rewrites 在构建期写进 routes-manifest，这个值必须在 build 时注入，改地址要重新构建镜像。
 * 浏览器始终走同源 `/api`：会话 Cookie 由 db-service 下发，经同源转发后落在站点域名下，
 * SSR（next/headers 的 cookies()）与 proxy 中间件才读得到登录态。
 */
function resolveApiProxyTarget(): string | null {
  const target = process.env.API_INTERNAL_ORIGIN;
  if (!target || !/^https?:\/\//.test(target)) return null;
  return target.replace(/\/+$/, '');
}

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
  // monorepo 内的共享包直接以 TS 源码发布，交给 Next 编译
  transpilePackages: ['@ai/constants', '@ai/utils'],
  output: 'standalone',
  outputFileTracingRoot: workspaceRoot,
  // 不下发 X-Powered-By: Next.js，少暴露一项技术栈信息
  poweredByHeader: false,
  experimental: {
    // 图片压缩接口经 rewrites 转发，请求体上限要覆盖 db-service 的 20MiB 单文件上限
    proxyClientMaxBodySize: '21mb',
  },
  // 必须是 beforeFiles：放到 afterFiles 会先被页面路由接走
  async rewrites() {
    const target = resolveApiProxyTarget();
    if (!target) return { beforeFiles: [], afterFiles: [], fallback: [] };

    return {
      beforeFiles: [
        // 通用接口排在兜底规则前面：外部转发命中第一条就结束
        ...COMMON_API_PREFIXES.map((prefix) => ({
          source: `${API_PROXY_PREFIX}${prefix}/:path*`,
          destination: `${target}${prefix}/:path*`,
        })),
        {
          source: `${API_PROXY_PREFIX}/:path*`,
          destination: `${target}/platform/:path*`,
        },
      ],
      afterFiles: [],
      fallback: [],
    };
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
    root: workspaceRoot,
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
