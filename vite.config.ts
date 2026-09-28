import { defineConfig } from 'vite-plus';
import { fmtConfig } from './vite.fmt.config';
import { lintConfig } from './vite.lint.config';

export default defineConfig({
  lint: lintConfig,
  fmt: fmtConfig,
  staged: {
    '*.{css,less,scss}': 'vp exec stylelint --fix',
    '*.{cjs,css,cts,html,js,json,jsx,less,md,mjs,mts,scss,ts,tsx,vue,yaml,yml}': 'vp check --fix',
  },
  run: {
    tasks: {
      verify: {
        command: [
          'vpr @ai/platform#prisma:generate',
          'vpr -r check',
          'vpr -r test',
          'vp exec stylelint --allow-empty-input --max-warnings 0 "**/*.{css,less,scss}"',
        ],
        cache: false,
      },
    },
  },
});
