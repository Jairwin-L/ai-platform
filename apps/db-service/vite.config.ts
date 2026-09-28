import { defineConfig } from 'vite-plus';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@/generated': fileURLToPath(new URL('./generated', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  pack: {
    entry: ['src/main.ts'],
    format: ['esm'],
    platform: 'node',
    target: 'node22',
    outDir: 'dist',
    clean: true,
    dts: false,
    sourcemap: true,
    deps: {
      // @ai/* 直接导出 .ts 源码，Node 运行时解析不了，必须打进产物；
      // 其余依赖保持 external，从 node_modules 解析（sharp / prisma 的原生与 wasm 资源不能被打包）
      alwaysBundle: [/^@ai\//],
    },
  },
  test: {
    include: ['tests/**/*.{test,spec}.ts', 'src/**/*.{test,spec}.ts'],
    passWithNoTests: true,
  },
});
