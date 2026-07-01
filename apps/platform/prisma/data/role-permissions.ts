import type { PrismaClient } from '../../generated/prisma/client';
import { throwIfRejected } from './promise-results';

export async function assignAdminRolePermissions(prisma: PrismaClient): Promise<void> {
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

export async function assignBasicRolePermissions(prisma: PrismaClient): Promise<void> {
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
