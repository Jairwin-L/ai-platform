import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PermissionType, Prisma, PrismaClient } from '@prisma/client';

interface PermissionData {
  name: string;
  code: string;
  parentCode: string | null;
  type: PermissionType;
  description: string | null;
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not configured.');
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const requiredTables = ['roles', 'permissions', 'role_permissions'];

const permissionsData: PermissionData[] = [
  {
    name: 'Articles',
    code: 'ARTICLES',
    parentCode: null,
    type: 'module',
    description: '文章管理模块',
  },
  {
    name: 'Article Management',
    code: 'ARTICLES:MANAGEMENT',
    parentCode: 'ARTICLES',
    type: 'page',
    description: '文章管理页面',
  },
  {
    name: 'Articles:View',
    code: 'ARTICLES:VIEW',
    parentCode: 'ARTICLES:MANAGEMENT',
    type: 'operation',
    description: '文章管理:查看',
  },
  {
    name: 'Articles:Add',
    code: 'ARTICLES:ADD',
    parentCode: 'ARTICLES:MANAGEMENT',
    type: 'operation',
    description: '文章管理:新增',
  },
  {
    name: 'Articles:Edit',
    code: 'ARTICLES:EDIT',
    parentCode: 'ARTICLES:MANAGEMENT',
    type: 'operation',
    description: '文章管理:编辑',
  },
  {
    name: 'Articles:Delete',
    code: 'ARTICLES:DELETE',
    parentCode: 'ARTICLES:MANAGEMENT',
    type: 'operation',
    description: '文章管理:删除',
  },
];

function throwIfRejected(results: Array<PromiseSettledResult<unknown>>): void {
  const rejected = results.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  );

  if (rejected) {
    throw rejected.reason;
  }
}

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

async function seedRoles(): Promise<void> {
  console.log('Seeding roles...');

  const roleResults = await Promise.allSettled([
    prisma.roles.upsert({
      where: { name: 'admin' },
      update: {
        name: 'admin',
        description: 'Administrator role',
        is_system: true,
        updated_at: new Date(),
      },
      create: { name: 'admin', description: 'Administrator role', is_system: true },
    }),
    prisma.roles.upsert({
      where: { name: 'user' },
      update: {
        name: 'user',
        description: 'Default user role',
        is_system: true,
        updated_at: new Date(),
      },
      create: { name: 'user', description: 'Default user role', is_system: true },
    }),
  ]);
  throwIfRejected(roleResults);

  await prisma.$executeRaw`
    SELECT setval(pg_get_serial_sequence('roles', 'id'), COALESCE((SELECT MAX(id) FROM roles), 0) + 1, false)
  `;
  console.log('Seeded 2 roles.');
}

async function seedPermissions(): Promise<void> {
  console.log('Seeding permissions...');
  const seededPermissions = await permissionsData.reduce<
    Promise<Array<{ code: string; id: number }>>
  >(async (previousSeededPermissions, permission) => {
    const existingPermissions = await previousSeededPermissions;
    const permissionIdsByCode = new Map(
      existingPermissions.map((existingPermission) => [
        existingPermission.code,
        existingPermission.id,
      ]),
    );
    const parent_id = permission.parentCode ? permissionIdsByCode.get(permission.parentCode) : null;

    if (permission.parentCode && typeof parent_id !== 'number') {
      throw new Error(
        `Parent permission not found for ${permission.code}: ${permission.parentCode}`,
      );
    }

    const seededPermission = await prisma.permissions.upsert({
      where: { code: permission.code },
      update: {
        name: permission.name,
        code: permission.code,
        parent_id,
        type: permission.type,
        description: permission.description,
        updated_at: new Date(),
      },
      create: {
        name: permission.name,
        code: permission.code,
        parent_id,
        type: permission.type,
        description: permission.description,
      },
      select: { id: true, code: true },
    });

    return [...existingPermissions, seededPermission];
  }, Promise.resolve([]));

  await prisma.$executeRaw`
    SELECT setval(pg_get_serial_sequence('permissions', 'id'), COALESCE((SELECT MAX(id) FROM permissions), 0) + 1, false)
  `;
  console.log(`Seeded ${seededPermissions.length} permissions.`);
}

async function assignAdminRolePermissions(): Promise<void> {
  console.log('Assigning administrator permissions...');
  const adminRole = await prisma.roles.findUnique({ where: { name: 'admin' } });

  if (!adminRole) {
    console.error('Administrator role not found. Skipping permission assignment.');
    return;
  }

  const allPermissions = await prisma.permissions.findMany({ select: { id: true } });
  await prisma.rolePermissions.deleteMany({ where: { role_id: adminRole.id } });

  const rolePermissionResults = await Promise.allSettled(
    allPermissions.map((permission) =>
      prisma.rolePermissions.create({
        data: { role_id: adminRole.id, permission_id: permission.id },
      }),
    ),
  );
  throwIfRejected(rolePermissionResults);

  console.log(`Assigned ${allPermissions.length} permissions to administrator role.`);
}

async function assignBasicRolePermissions(): Promise<void> {
  const lookupResults = await Promise.allSettled([
    prisma.roles.findUnique({ where: { name: 'user' } }),
    prisma.permissions.findUnique({ where: { code: 'ARTICLES:VIEW' } }),
  ]);
  throwIfRejected(lookupResults);

  const [userRole, viewPermission] = lookupResults.map((result) =>
    result.status === 'fulfilled' ? result.value : null,
  );

  if (!viewPermission) {
    return;
  }

  const roleIds = [userRole?.id].filter((roleId): roleId is number => typeof roleId === 'number');
  const rolePermissionResults = await Promise.allSettled(
    roleIds.map((roleId) =>
      prisma.rolePermissions.upsert({
        where: { role_id_permission_id: { role_id: roleId, permission_id: viewPermission.id } },
        update: {},
        create: { role_id: roleId, permission_id: viewPermission.id },
      }),
    ),
  );
  throwIfRejected(rolePermissionResults);
}

async function main(): Promise<void> {
  await assertRequiredTablesExist();
  await seedRoles();
  await seedPermissions();
  await assignAdminRolePermissions();
  await assignBasicRolePermissions();
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
