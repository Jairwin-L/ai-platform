import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
const migrationsPath = join(process.cwd(), 'prisma', 'migrations');
const baselineMigrationName = '00000000000000_init';
const roleCodeMigrationName = '20260706000000_role_code_storage';

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not configured.');
}

function runCommand(command: string, args: string[]): void {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: process.env,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status ?? 1}.`);
  }
}

function getMigrationNames(): string[] {
  return readdirSync(migrationsPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function getBusinessTableCount(pool: Pool): Promise<number> {
  const result = await pool.query<{ count: string }>(`
    SELECT COUNT(*)::TEXT AS count
    FROM information_schema.tables
    WHERE table_schema = current_schema()
      AND table_type = 'BASE TABLE'
      AND table_name <> '_prisma_migrations'
  `);

  return Number(result.rows[0]?.count ?? 0);
}

async function hasPrismaMigrationsTable(pool: Pool): Promise<boolean> {
  const result = await pool.query<{ exists: boolean }>(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = current_schema()
        AND table_name = '_prisma_migrations'
    ) AS exists
  `);

  return result.rows[0]?.exists ?? false;
}

async function hasRolesCodeColumn(pool: Pool): Promise<boolean> {
  const result = await pool.query<{ exists: boolean }>(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'roles'
        AND column_name = 'code'
    ) AS exists
  `);

  return result.rows[0]?.exists ?? false;
}

async function getAppliedMigrationNames(pool: Pool): Promise<Set<string>> {
  const result = await pool.query<{ migration_name: string }>(`
    SELECT migration_name
    FROM "_prisma_migrations"
    WHERE finished_at IS NOT NULL
      AND rolled_back_at IS NULL
  `);

  return new Set(result.rows.map((row) => row.migration_name));
}

function markMigrationsApplied(migrationNames: string[]): void {
  for (const migrationName of migrationNames) {
    runCommand('vp', ['exec', 'prisma', 'migrate', 'resolve', '--applied', migrationName]);
  }
}

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const migrationNames = getMigrationNames();
    const businessTableCount = await getBusinessTableCount(pool);

    if (businessTableCount === 0) {
      console.log('No business tables found. Applying Prisma migrations.');
      runCommand('vp', ['run', 'prisma:deploy']);
      return;
    }

    const migrationsTableExists = await hasPrismaMigrationsTable(pool);
    const rolesCodeColumnExists = await hasRolesCodeColumn(pool);

    if (!migrationNames.includes(baselineMigrationName)) {
      throw new Error(`Missing required baseline migration: ${baselineMigrationName}.`);
    }

    if (!migrationsTableExists) {
      console.log('Existing database is not baselined. Marking baseline migration as applied.');
      markMigrationsApplied([baselineMigrationName]);
    }

    if (migrationsTableExists && rolesCodeColumnExists) {
      const appliedMigrationNames = await getAppliedMigrationNames(pool);

      if (
        migrationNames.includes(roleCodeMigrationName) &&
        !appliedMigrationNames.has(roleCodeMigrationName)
      ) {
        console.log('roles.code already exists. Baselining role code migration.');
        markMigrationsApplied([roleCodeMigrationName]);
      }
    }

    console.log('Applying pending Prisma migrations.');
    runCommand('vp', ['run', 'prisma:deploy']);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Prisma deploy sync failed:', error);
  process.exit(1);
});
