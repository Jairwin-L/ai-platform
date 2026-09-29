/**
 * Stylelint 配置（仓库唯一入口，取代此前 apps/platform/package.json 的 stylelint 字段）
 *
 * 职责边界：样式文件的**格式化**由 Vite+ 的 Oxfmt（`vp fmt` / `vp check`）负责，
 * 这里只保留 Oxfmt 覆盖不到的**正确性**检查。
 */

export default {
  extends: ['stylelint-config-ali'],

  // 只检查手写源码，构建产物是压缩后的单行 CSS，扫描只会产生噪音
  ignoreFiles: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/es/**',
    '**/lib/**',
    '**/.next/**',
    '**/out/**',
    '**/coverage/**',
    '**/*.min.css',
  ],

  overrides: [
    {
      /**
       * Tiptap 模板样式沿用上游写法：每组变量先写亮色，紧跟一个 `.dark &`
       * 覆盖块，因此同一文件里同一选择器会按组重复出现。这是其固有结构，
       * 合并后反而破坏「变量与其暗色覆盖就近可读」的组织方式。
       */
      files: ['**/tiptap-*/**/*.scss', '**/tiptap-*.scss'],
      rules: {
        'no-duplicate-selectors': null,
      },
    },
  ],
};
