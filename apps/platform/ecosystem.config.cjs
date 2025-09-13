module.exports = {
  apps: [
    {
      name: 'nextjs-blank-template',
      script: 'pnpm',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      ignore_watch: ['node_modules'],
      env: {
        NODE_ENV: 'production',
        PORT: 8062,
        API_URL: 'https://m1.apifoxmock.com/m1/7116578-6839375-default',
      },
    },
    {
      name: 'nextjs-blank-template-test',
      script: 'pnpm',
      args: 'start:test',
      instances: 1,
      exec_mode: 'cluster',
      watch: ['.next'],
      ignore_watch: ['node_modules'],
      env: {
        NODE_ENV: 'test',
        PORT: 8061,
        API_URL: 'https://m1.apifoxmock.com/m1/7116580-6839377-default',
      },
    },
    {
      name: 'nextjs-blank-template-dev',
      script: 'pnpm',
      args: 'start:dev',
      instances: 1,
      exec_mode: 'cluster',
      watch: ['.next'],
      ignore_watch: ['node_modules'],
      env: {
        NODE_ENV: 'development',
        PORT: 8060,
        API_URL: 'https://m1.apifoxmock.com/m1/7116581-6839378-default',
      },
    },
  ],
};
