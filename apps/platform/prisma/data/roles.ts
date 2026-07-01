import type { PrismaClient } from '../../generated/prisma/client';
import { throwIfRejected } from './promise-results';

export async function seedRoles(prisma: PrismaClient): Promise<void> {
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
