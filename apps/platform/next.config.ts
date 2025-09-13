import type { NextConfig } from 'next';
import path from 'path';
const { loadEnvConfig } = require('@next/env');

loadEnvConfig(process.cwd());

const nextConfig: NextConfig = {
  turbopack: {
    // https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#root-directory
    root: path.join(__dirname, '..'),
  },
  env: {
    APP_ENV: process.env.APP_ENV,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
};

export default nextConfig;
