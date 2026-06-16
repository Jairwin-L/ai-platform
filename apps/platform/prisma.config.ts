import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/data/main.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
