import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Pool, type PoolClient } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
const migrationsPath = join(process.cwd(), 'prisma', 'migrations');
const baselineMigrationName = '00000000000000_init';
const roleCodeMigrationName = '20260706000000_role_code_storage';
const aiUploadPermissionsMigrationName = '20260708020000_ai_upload_permissions';
const aiUploadPermissionCodes = [
  'AI',
  'AI:CHAT',
  'AI:CHAT:USE',
  'AI:SETTINGS',
  'AI:SETTINGS:VIEW',
  'AI:SETTINGS:MANAGE',
  'UPLOAD',
  'UPLOAD:MANAGEMENT',
  'UPLOAD:CREATE',
  'UPLOAD:COMPRESS',
];

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

async function getFailedMigrationNames(pool: Pool): Promise<Set<string>> {
  const result = await pool.query<{ migration_name: string }>(`
    SELECT migration_name
    FROM "_prisma_migrations"
    WHERE finished_at IS NULL
      AND rolled_back_at IS NULL
  `);

  return new Set(result.rows.map((row) => row.migration_name));
}

function markMigrationsApplied(migrationNames: string[]): void {
  for (const migrationName of migrationNames) {
    runCommand('vp', ['exec', 'prisma', 'migrate', 'resolve', '--applied', migrationName]);
  }
}

async function applyAiUploadPermissionsRepair(client: PoolClient): Promise<void> {
  await client.query(`
    WITH module_permission_seeds ("code", "name", "parent_id", "type", "description") AS (
      VALUES
        ('AI', 'AI', NULL::INTEGER, 'module'::"PermissionType", 'AI 模块'),
        ('UPLOAD', 'Upload', NULL::INTEGER, 'module'::"PermissionType", '上传模块')
    ),
    updated_permissions AS (
      UPDATE "permissions" permissions
      SET
        "name" = module_permission_seeds."name",
        "parent_id" = module_permission_seeds."parent_id",
        "type" = module_permission_seeds."type",
        "description" = module_permission_seeds."description",
        "updated_at" = now()
      FROM module_permission_seeds
      WHERE permissions."code" = module_permission_seeds."code"
      RETURNING permissions."code"
    )
    INSERT INTO "permissions" ("code", "name", "parent_id", "type", "description", "updated_at")
    SELECT
      module_permission_seeds."code",
      module_permission_seeds."name",
      module_permission_seeds."parent_id",
      module_permission_seeds."type",
      module_permission_seeds."description",
      now()
    FROM module_permission_seeds
    WHERE NOT EXISTS (
      SELECT 1
      FROM updated_permissions
      WHERE updated_permissions."code" = module_permission_seeds."code"
    )
      AND NOT EXISTS (
        SELECT 1
        FROM "permissions"
        WHERE "permissions"."code" = module_permission_seeds."code"
      );
  `);

  await client.query(`
    WITH page_permission_seeds ("code", "name", "parent_code", "type", "description") AS (
      VALUES
        ('AI:CHAT', 'AI Chat', 'AI', 'page'::"PermissionType", 'AI Chat 页面'),
        ('AI:SETTINGS', 'AI Settings', 'AI', 'page'::"PermissionType", 'AI 设置页面'),
        ('UPLOAD:MANAGEMENT', 'Upload Management', 'UPLOAD', 'page'::"PermissionType", '上传管理页面'),
        ('AI:CHAT:USE', 'AI Chat:Use', 'AI:CHAT', 'operation'::"PermissionType", 'AI Chat:使用'),
        ('AI:SETTINGS:VIEW', 'AI Settings:View', 'AI:SETTINGS', 'operation'::"PermissionType", 'AI 设置:查看'),
        ('AI:SETTINGS:MANAGE', 'AI Settings:Manage', 'AI:SETTINGS', 'operation'::"PermissionType", 'AI 设置:管理'),
        ('UPLOAD:CREATE', 'Upload:Create', 'UPLOAD:MANAGEMENT', 'operation'::"PermissionType", '上传管理:上传文件'),
        ('UPLOAD:COMPRESS', 'Upload:Compress', 'UPLOAD:MANAGEMENT', 'operation'::"PermissionType", '上传管理:压缩图片')
    ),
    parent_permissions AS (
      SELECT DISTINCT ON ("code") "code", "id"
      FROM "permissions"
      ORDER BY "code", "id"
    ),
    seed_permissions AS (
      SELECT
        page_permission_seeds."code",
        page_permission_seeds."name",
        parent_permissions."id" AS "parent_id",
        page_permission_seeds."type",
        page_permission_seeds."description"
      FROM page_permission_seeds
      INNER JOIN parent_permissions ON parent_permissions."code" = page_permission_seeds."parent_code"
    ),
    updated_permissions AS (
      UPDATE "permissions" permissions
      SET
        "name" = seed_permissions."name",
        "parent_id" = seed_permissions."parent_id",
        "type" = seed_permissions."type",
        "description" = seed_permissions."description",
        "updated_at" = now()
      FROM seed_permissions
      WHERE permissions."code" = seed_permissions."code"
      RETURNING permissions."code"
    )
    INSERT INTO "permissions" ("code", "name", "parent_id", "type", "description", "updated_at")
    SELECT
      seed_permissions."code",
      seed_permissions."name",
      seed_permissions."parent_id",
      seed_permissions."type",
      seed_permissions."description",
      now()
    FROM seed_permissions
    WHERE NOT EXISTS (
      SELECT 1
      FROM updated_permissions
      WHERE updated_permissions."code" = seed_permissions."code"
    )
      AND NOT EXISTS (
        SELECT 1
        FROM "permissions"
        WHERE "permissions"."code" = seed_permissions."code"
      );
  `);

  await client.query(
    `
      WITH site_role AS (
        SELECT "id"
        FROM "roles"
        WHERE "code" = 'SITE_USER'
        ORDER BY "id"
        LIMIT 1
      ),
      site_permissions AS (
        SELECT DISTINCT ON ("code") "id", "code"
        FROM "permissions"
        WHERE "code" = ANY($1::TEXT[])
        ORDER BY "code", "id"
      )
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT site_role."id", site_permissions."id"
      FROM site_role
      CROSS JOIN site_permissions
      WHERE NOT EXISTS (
        SELECT 1
        FROM "role_permissions" existing_role_permissions
        WHERE existing_role_permissions."role_id" = site_role."id"
          AND existing_role_permissions."permission_id" = site_permissions."id"
      );
    `,
    [aiUploadPermissionCodes],
  );
}

async function validateAiUploadPermissionsRepair(client: PoolClient): Promise<void> {
  const permissionResult = await client.query<{ count: string }>(
    `
      SELECT COUNT(DISTINCT "code")::TEXT AS count
      FROM "permissions"
      WHERE "code" = ANY($1::TEXT[])
    `,
    [aiUploadPermissionCodes],
  );
  const rolePermissionResult = await client.query<{ count: string }>(
    `
      WITH site_role AS (
        SELECT "id"
        FROM "roles"
        WHERE "code" = 'SITE_USER'
        ORDER BY "id"
        LIMIT 1
      )
      SELECT COUNT(DISTINCT permissions."code")::TEXT AS count
      FROM site_role
      INNER JOIN "role_permissions" role_permissions ON role_permissions."role_id" = site_role."id"
      INNER JOIN "permissions" permissions ON permissions."id" = role_permissions."permission_id"
      WHERE permissions."code" = ANY($1::TEXT[])
    `,
    [aiUploadPermissionCodes],
  );

  const permissionCount = Number(permissionResult.rows[0]?.count ?? 0);
  const rolePermissionCount = Number(rolePermissionResult.rows[0]?.count ?? 0);

  if (
    permissionCount !== aiUploadPermissionCodes.length ||
    rolePermissionCount !== aiUploadPermissionCodes.length
  ) {
    throw new Error(
      `${aiUploadPermissionsMigrationName} repair did not reach expected state. ` +
        `permissions=${permissionCount}, role_permissions=${rolePermissionCount}`,
    );
  }
}

async function repairAiUploadPermissionsMigration(pool: Pool): Promise<void> {
  console.log('Repairing AI upload permissions migration before resolving it.');

  const client = await pool.connect();

  await client.query('BEGIN');

  try {
    await applyAiUploadPermissionsRepair(client);
    await validateAiUploadPermissionsRepair(client);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  markMigrationsApplied([aiUploadPermissionsMigrationName]);
}

async function repairKnownFailedMigrations(pool: Pool): Promise<void> {
  const failedMigrationNames = await getFailedMigrationNames(pool);

  if (failedMigrationNames.has(aiUploadPermissionsMigrationName)) {
    await repairAiUploadPermissionsMigration(pool);
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

    if (migrationsTableExists) {
      await repairKnownFailedMigrations(pool);
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
