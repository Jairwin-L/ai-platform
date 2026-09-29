import type { NextConfig } from 'next';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { API_PROXY_PREFIX, COMMON_API_PREFIXES, PLATFORM_API_NAMESPACE } from './src/api/base-url';

const root = dirname(fileURLToPath(import.meta.url));
// pnpm workspace root: dependencies are hoisted into <workspace>/node_modules/.pnpm,
// so Turbopack and output file tracing must be able to reach it.
const workspaceRoot = resolve(root, '../..');

/** 站点域名：next/image 远程图片与 Server Actions 的同源校验共用 */
const SITE_HOSTNAME = 'nextjs-starter-kit.jairwin.cc';

const REMOTE_PATTERNS = [
  {
    protocol: 'https',
    hostname: SITE_HOSTNAME,
    port: '',
    pathname: '/**',
  },
] satisfies NonNullable<NonNullable<NextConfig['images']>['remotePatterns']>;

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

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // 不下发 X-Powered-By: Next.js，少暴露一项技术栈信息
  poweredByHeader: false,
  // monorepo 内的共享包直接以 TS 源码发布，交给 Next 编译
  // alova 的 ESM 产物含 class static block（ES2022），iOS Safari < 16.4 解析即报
  // SyntaxError，整个 client chunk 挂掉，必须交给 SWC 按 browserslist 降级
  transpilePackages: ['@ai/constants', '@ai/utils', 'alova'],
  output: 'standalone',
  // monorepo：standalone 产物需要把 workspace 根目录纳入文件追踪范围
  outputFileTracingRoot: workspaceRoot,
  productionBrowserSourceMaps: false,
  reactCompiler: true,
  experimental: {
    authInterrupts: true,
    // 图片压缩接口经 rewrites 转发，请求体上限要覆盖 db-service 的 6MiB 单文件上限
    proxyClientMaxBodySize: '6mb',
    turbopackRustReactCompiler: true,
    serverActions: {
      allowedOrigins: [SITE_HOSTNAME],
      bodySizeLimit: '6mb',
    },
  },
  // 必须是 beforeFiles：放到 afterFiles 会先被页面路由接走
  async rewrites() {
    const target = resolveApiProxyTarget();
    if (!target) return { beforeFiles: [], afterFiles: [], fallback: [] };

    return {
      beforeFiles: [
        // 通用接口在 db-service 只挂根路径，转发时去掉同源前缀。
        // 必须排在兜底规则前面：外部转发命中第一条就结束，不会再往下匹配。
        ...COMMON_API_PREFIXES.map((prefix) => ({
          source: `${API_PROXY_PREFIX}${prefix}/:path*`,
          destination: `${target}${prefix}/:path*`,
        })),
        {
          // 其余前台接口在 db-service 收在 `platform/` 命名空间下
          source: `${API_PROXY_PREFIX}/:path*`,
          destination: `${target}${PLATFORM_API_NAMESPACE}/:path*`,
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  sassOptions: {
    implementation: 'sass-embedded',
    fiber: false,
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
};

export default nextConfig;
