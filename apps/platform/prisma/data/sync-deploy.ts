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

interface PermissionSeed {
  code: string;
  name: string;
  parentCode: string | null;
  type: 'module' | 'page' | 'operation';
  description: string;
}

const aiUploadPermissionSeeds: PermissionSeed[] = [
  {
    code: 'AI',
    name: 'AI',
    parentCode: null,
    type: 'module',
    description: 'AI 模块',
  },
  {
    code: 'UPLOAD',
    name: 'Upload',
    parentCode: null,
    type: 'module',
    description: '上传模块',
  },
  {
    code: 'AI:CHAT',
    name: 'AI Chat',
    parentCode: 'AI',
    type: 'page',
    description: 'AI Chat 页面',
  },
  {
    code: 'AI:SETTINGS',
    name: 'AI Settings',
    parentCode: 'AI',
    type: 'page',
    description: 'AI 设置页面',
  },
  {
    code: 'UPLOAD:MANAGEMENT',
    name: 'Upload Management',
    parentCode: 'UPLOAD',
    type: 'page',
    description: '上传管理页面',
  },
  {
    code: 'AI:CHAT:USE',
    name: 'AI Chat:Use',
    parentCode: 'AI:CHAT',
    type: 'operation',
    description: 'AI Chat:使用',
  },
  {
    code: 'AI:SETTINGS:VIEW',
    name: 'AI Settings:View',
    parentCode: 'AI:SETTINGS',
    type: 'operation',
    description: 'AI 设置:查看',
  },
  {
    code: 'AI:SETTINGS:MANAGE',
    name: 'AI Settings:Manage',
    parentCode: 'AI:SETTINGS',
    type: 'operation',
    description: 'AI 设置:管理',
  },
  {
    code: 'UPLOAD:CREATE',
    name: 'Upload:Create',
    parentCode: 'UPLOAD:MANAGEMENT',
    type: 'operation',
    description: '上传管理:上传文件',
  },
  {
    code: 'UPLOAD:COMPRESS',
    name: 'Upload:Compress',
    parentCode: 'UPLOAD:MANAGEMENT',
    type: 'operation',
    description: '上传管理:压缩图片',
  },
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

async function getPermissionId(client: PoolClient, code: string): Promise<number | null> {
  const result = await client.query<{ id: number }>(
    `
      SELECT "id"
      FROM "permissions"
      WHERE "code" = $1
      ORDER BY "id"
      LIMIT 1
    `,
    [code],
  );

  return result.rows[0]?.id ?? null;
}

async function getSiteRoleId(client: PoolClient): Promise<number | null> {
  const result = await client.query<{ id: number }>(
    `
      SELECT "id"
      FROM "roles"
      WHERE "code" = 'SITE_USER'
      ORDER BY "id"
      LIMIT 1
    `,
  );

  return result.rows[0]?.id ?? null;
}

async function upsertPermission(client: PoolClient, seed: PermissionSeed): Promise<number> {
  const existingId = await getPermissionId(client, seed.code);
  const parentId = seed.parentCode ? await getPermissionId(client, seed.parentCode) : null;

  if (seed.parentCode && parentId === null) {
    throw new Error(`Missing parent permission ${seed.parentCode} for ${seed.code}.`);
  }

  if (existingId !== null) {
    await client.query(
      `
        UPDATE "permissions"
        SET
          "name" = $2,
          "parent_id" = $3,
          "type" = $4::"PermissionType",
          "description" = $5,
          "updated_at" = now()
        WHERE "id" = $1
      `,
      [existingId, seed.name, parentId, seed.type, seed.description],
    );

    return existingId;
  }

  const created = await client.query<{ id: number }>(
    `
      INSERT INTO "permissions" ("code", "name", "parent_id", "type", "description", "updated_at")
      VALUES ($1, $2, $3, $4::"PermissionType", $5, now())
      RETURNING "id"
    `,
    [seed.code, seed.name, parentId, seed.type, seed.description],
  );

  const createdId = created.rows[0]?.id;

  if (!createdId) {
    throw new Error(`Failed to create permission ${seed.code}.`);
  }

  return createdId;
}

async function ensureSiteRolePermission(
  client: PoolClient,
  siteRoleId: number,
  permissionId: number,
): Promise<void> {
  await client.query(
    `
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT $1, $2
      WHERE NOT EXISTS (
        SELECT 1
        FROM "role_permissions"
        WHERE "role_id" = $1
          AND "permission_id" = $2
      )
    `,
    [siteRoleId, permissionId],
  );
}

async function applyAiUploadPermissionsRepair(client: PoolClient): Promise<void> {
  const permissionIds = new Map<string, number>();

  for (const seed of aiUploadPermissionSeeds) {
    permissionIds.set(seed.code, await upsertPermission(client, seed));
  }

  const siteRoleId = await getSiteRoleId(client);

  if (siteRoleId === null) {
    throw new Error('SITE_USER role is missing.');
  }

  for (const permissionCode of aiUploadPermissionCodes) {
    const permissionId = permissionIds.get(permissionCode);

    if (!permissionId) {
      throw new Error(`Permission ${permissionCode} was not repaired.`);
    }

    await ensureSiteRolePermission(client, siteRoleId, permissionId);
  }
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
