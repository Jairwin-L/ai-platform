module.exports = {
  apps: [
    {
      name: 'nextjs-blank-template',
      script: 'pnpm',
      args: 'start',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      ignore_watch: ['node_modules'],
      env: {
        NODE_ENV: 'production',
        PORT: 8062,
      },
    },
    {
      name: 'nextjs-blank-template-test',
      script: 'pnpm',
      args: 'start:test',
      cwd: __dirname,
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
      name: 'nextjs-blank-template-dev',
      script: 'pnpm',
      args: 'start:dev',
      cwd: __dirname,
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
