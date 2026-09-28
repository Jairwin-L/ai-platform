import { defineConfig } from 'vite-plus';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // BYOK 等接口层单测已随实现迁到 apps/db-service/tests，platform 暂无单测
    passWithNoTests: true,
  },
});
