import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../../generated/prisma/client';
import { RoleCode } from './system-roles';

const bootstrapAdminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim();
const strictMode = process.env.BOOTSTRAP_ADMIN_STRICT === 'true';
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not configured.');
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const requiredTables = ['users', 'roles', 'user_roles'];

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
        'Run "vp run prisma:setup" before bootstrapping the administrator role.',
      ].join('\n'),
    );
  }
}

async function main(): Promise<void> {
  if (!bootstrapAdminEmail) {
    console.log('BOOTSTRAP_ADMIN_EMAIL is not set. Skipping admin bootstrap.');
    return;
  }

  await assertRequiredTablesExist();

  const users = await prisma.users.findMany({
    where: { email: bootstrapAdminEmail },
    orderBy: { created_at: 'asc' },
    take: 2,
    select: { id: true },
  });

  if (users.length === 0) {
    const message = 'Bootstrap admin user not found';
    if (strictMode) {
      throw new Error(message);
    }

    console.warn(`${message}. Skipping admin bootstrap.`);
    return;
  }

  if (users.length > 1) {
    throw new Error(`Multiple users found for BOOTSTRAP_ADMIN_EMAIL: ${bootstrapAdminEmail}`);
  }

  const [user] = users;
  const adminRole = await prisma.roles.findUnique({
    where: { code: RoleCode.SUPER_ADMIN },
    select: { id: true },
  });

  if (!adminRole) {
    throw new Error(
      'SUPER_ADMIN role not found. Run "vp run prisma:seed" before bootstrapping admin.',
    );
  }

  const existingRole = await prisma.userRoles.findFirst({
    where: {
      user_id: user.id,
      role_id: adminRole.id,
      revoked_at: null,
    },
    select: { id: true },
  });

  if (!existingRole) {
    await prisma.userRoles.create({
      data: {
        user_id: user.id,
        role_id: adminRole.id,
      },
    });
  }

  console.log('Bootstrap SUPER_ADMIN role assigned.');
}

main()
  .catch((error) => {
    console.error('Bootstrap admin failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
