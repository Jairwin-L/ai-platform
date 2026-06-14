import type { NextConfig } from 'next';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: 'standalone',
  sassOptions: {
    loadPaths: [root],
    additionalData: [
      '@import "src/styles/variable.scss";',
      '@import "src/styles/mixins.scss";',
    ].join('\n'),
    charset: false,
    silenceDeprecations: ['import', 'legacy-js-api'],
  },
  turbopack: {
    root,
  },
};

export default nextConfig;
