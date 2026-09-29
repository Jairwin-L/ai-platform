import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../../generated/prisma/client';

/**
 * 每个种子入口共用的连接与收尾逻辑。
 * 失败时只设置退出码、不直接 process.exit，保证连接池总能关闭。
 */
export function runSeed(name: string, seed: (prisma: PrismaClient) => Promise<void>): void {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured.');
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  seed(prisma)
    .catch((error) => {
      console.error(`${name}执行失败:`, error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}

export async function assertTablesExist(
  prisma: PrismaClient,
  tables: string[],
  seedScript: string,
): Promise<void> {
  const tableResults = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = current_schema()
      AND table_name IN (${Prisma.join(tables)})
  `;
  const existingTables = new Set(tableResults.map((result) => result.table_name));
  const missingTables = tables.filter((tableName) => !existingTables.has(tableName));

  if (missingTables.length > 0) {
    throw new Error(
      [
        `Missing database table(s): ${missingTables.join(', ')}`,
        `Run "vpr @ai/db-service#prisma:push" (or apply migrations) before "vpr @ai/db-service#${seedScript}".`,
      ].join('\n'),
    );
  }
}
