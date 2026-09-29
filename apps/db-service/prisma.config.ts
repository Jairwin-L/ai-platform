import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/data/main.ts',
  },
  datasource: {
    // 不用 env()：它在缺值时直接抛错，会让不连库的 prisma generate（check / build / CI）
    // 也依赖本地 .env；migrate / push 等连库命令缺值时仍由 Prisma 自己报错
    url: process.env.DATABASE_URL,
  },
});
