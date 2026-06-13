module.exports = {
  apps: [
    {
      name: 'nextjs-starter-kit',
      script: 'pnpm',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      ignore_watch: ['node_modules'],
      env: {
        NODE_ENV: 'production',
        PORT: 8062,
      },
    },
    {
      name: 'nextjs-starter-kit-test',
      script: 'pnpm',
      args: 'start:test',
      instances: 1,
      exec_mode: 'cluster',
      watch: ['.next'],
      ignore_watch: ['node_modules'],
      env: {
        NODE_ENV: 'test',
        PORT: 8061,
      },
    },
    {
      name: 'nextjs-starter-kit-dev',
      script: 'pnpm',
      args: 'start:dev',
      instances: 1,
      exec_mode: 'cluster',
      watch: ['.next'],
      ignore_watch: ['node_modules'],
      env: {
        NODE_ENV: 'development',
        PORT: 8060,
      },
    },
  ],
};
