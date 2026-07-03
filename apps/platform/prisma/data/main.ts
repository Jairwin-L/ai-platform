import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../../generated/prisma/client';
import { seedAiProviders } from './ai-providers';
import { seedPermissions } from './permissions';
import { assignAdminRolePermissions, assignBasicRolePermissions } from './role-permissions';
import { seedRoles } from './roles';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not configured.');
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const requiredTables = ['roles', 'permissions', 'role_permissions', 'ai_providers'];

async function assertRequiredTablesExist(): Promise<void> {
  const tableResults = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = current_schema()
      AND table_name IN (${Prisma.join(requiredTables)})
  `;
  const existingTables = new Set(tableResults.map((result) => result.table_name));
  const missingTables = requiredTables.filter((tableName) => !existingTables.has(tableName));

  if (missingTables.length > 0) {
    throw new Error(
      [
        `Missing database table(s): ${missingTables.join(', ')}`,
        'Run "vp run prisma:push" before "vp run prisma:seed", or run "vp run prisma:setup".',
      ].join('\n'),
    );
  }
}

async function main(): Promise<void> {
  await assertRequiredTablesExist();
  await seedRoles(prisma);
  await seedPermissions(prisma);
  await seedAiProviders(prisma);
  await assignAdminRolePermissions(prisma);
  await assignBasicRolePermissions(prisma);
}

main()
  .catch((error) => {
    console.error('Seed script failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
