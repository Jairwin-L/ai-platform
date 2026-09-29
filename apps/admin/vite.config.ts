import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, lazyPlugins } from 'vite-plus';

const resolvePath = (dir: string) => fileURLToPath(new URL(dir, import.meta.url));

/** 本地 db-service 地址，只用于开发态代理；线上由 VITE_BASE_API_URL 直连 */
const DEV_API_TARGET = process.env.VITE_DEV_API_TARGET || 'http://localhost:8070';

/** 匹配 pnpm 布局下 node_modules 中的包，如 node_modules/.pnpm/antd@x/node_modules/antd/ */
const nodeModules = (packages: string) =>
  new RegExp(`[\\\\/]node_modules[\\\\/](${packages})[\\\\/]`);

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': resolvePath('./src'),
    },
  },
  server: {
    port: 8050,
    /**
     * 开发态经 vite 代理访问 db-service，保持同源：会话是 db-service 下发的 HttpOnly Cookie，
     * 同源时浏览器才会稳定带上。`/api` 前缀在转发时去掉，db-service 没有全局前缀。
     */
    proxy: {
      '/api': {
        target: DEV_API_TARGET,
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api/, ''),
      },
    },
  },
  preview: {
    port: 8051,
  },
  build: {
    outDir: 'dist',
    rolldownOptions: {
      output: {
        /**
         * 按库拆 vendor chunk：业务代码变更不影响 vendor 的浏览器缓存。
         * priority 越大越先匹配；未命中分组的依赖跟随引用它的业务 chunk。
         */
        codeSplitting: {
          includeDependenciesRecursively: false,
          groups: [
            {
              name: 'vendor-antd',
              test: nodeModules('antd|@ant-design/[^/\\\\]+|@rc-component/[^/\\\\]+|rc-[^/\\\\]+'),
              priority: 20,
            },
            {
              name: 'vendor-react',
              test: nodeModules('react|react-dom|scheduler|react-router'),
              priority: 10,
            },
          ],
        },
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // 只注入变量与 mixin：global.scss 含真实样式规则，注入到 *.module.scss 会被 CSS Module 局部化，
        // 改由 root.tsx 单独引入
        additionalData: '@use "@/styles/variable.scss" as *;\n@use "@/styles/mixin.scss" as *;\n',
      },
    },
  },
  test: {
    include: ['tests/**/*.{test,spec}.{ts,tsx}', 'src/**/*.{test,spec}.{ts,tsx}'],
    passWithNoTests: true,
  },
  plugins: lazyPlugins(() => [react()]),
});
