import { defineConfig } from 'vite-plus';
import { fmtConfig } from './vite.fmt.config';
import { lintConfig } from './vite.lint.config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  lint: lintConfig,
  fmt: fmtConfig,
  resolve: {
    alias: {
      '@/generated': fileURLToPath(new URL('./generated', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  staged: {
    '*.{css,less,scss}': 'stylelint --fix',
    '*.{cjs,css,cts,html,js,json,jsx,less,md,mjs,mts,scss,ts,tsx,vue,yaml,yml}': 'vp check --fix',
  },
  run: {
    tasks: {
      verify: {
        command: ['vp run prisma:generate', 'vp check', 'vp test'],
        cache: false,
      },
    },
  },
});
