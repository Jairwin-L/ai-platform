import type { PrismaClient } from '../../generated/prisma/client';
import { throwIfRejected } from './promise-results';
import { SITE_PERMISSION_CODES } from './permissions';
import { RoleCode } from './system-roles';

const ADMIN_ONLY_ROLE_CODES = [
  RoleCode.SUPER_ADMIN,
  RoleCode.ADMIN,
  RoleCode.OPERATOR,
  RoleCode.APPROVER,
  RoleCode.AUDITOR,
  RoleCode.READ_ONLY,
];

export async function assignAdminRolePermissions(prisma: PrismaClient): Promise<void> {
  console.log('Synchronizing administrator permissions...');
  const [adminRolesResult, sitePermissionsResult] = await Promise.allSettled([
    prisma.roles.findMany({
      where: { code: { in: ADMIN_ONLY_ROLE_CODES }, status: 'ENABLED' },
      select: { id: true },
    }),
    prisma.permissions.findMany({
      where: { code: { in: SITE_PERMISSION_CODES } },
      select: { id: true },
    }),
  ]);
  throwIfRejected([adminRolesResult, sitePermissionsResult]);

  const adminRoles = adminRolesResult.status === 'fulfilled' ? adminRolesResult.value : [];
  const sitePermissions =
    sitePermissionsResult.status === 'fulfilled' ? sitePermissionsResult.value : [];

  if (adminRoles.length > 0 && sitePermissions.length > 0) {
    await prisma.rolePermissions.deleteMany({
      where: {
        role_id: { in: adminRoles.map((role) => role.id) },
        permission_id: { in: sitePermissions.map((permission) => permission.id) },
      },
    });
  }

  console.log('Administrator roles are kept separate from site permissions.');
}

export async function assignSiteRolePermissions(prisma: PrismaClient): Promise<void> {
  console.log('Assigning site role permissions...');
  const [siteRoleResult, sitePermissionsResult] = await Promise.allSettled([
    prisma.roles.findUnique({ where: { code: RoleCode.SITE_USER } }),
    prisma.permissions.findMany({
      where: { code: { in: SITE_PERMISSION_CODES } },
      select: { id: true },
    }),
  ]);
  throwIfRejected([siteRoleResult, sitePermissionsResult]);

  const siteRole = siteRoleResult.status === 'fulfilled' ? siteRoleResult.value : null;
  const sitePermissions =
    sitePermissionsResult.status === 'fulfilled' ? sitePermissionsResult.value : [];

  if (!siteRole) {
    console.error('Site user role not found. Skipping permission assignment.');
    return;
  }

  await prisma.rolePermissions.deleteMany({ where: { role_id: siteRole.id } });

  const rolePermissionResults = await Promise.allSettled(
    sitePermissions.map((permission) =>
      prisma.rolePermissions.create({
        data: { role_id: siteRole.id, permission_id: permission.id },
      }),
    ),
  );
  throwIfRejected(rolePermissionResults);

  console.log(`Assigned ${sitePermissions.length} permissions to site user role.`);
}

export async function assignSiteRoleToActiveUsers(prisma: PrismaClient): Promise<void> {
  console.log('Assigning site role to active users...');

  const assigned = await prisma.$executeRaw`
    WITH site_role AS (
      SELECT "id"
      FROM "roles"
      WHERE "code" = ${RoleCode.SITE_USER}
    ),
    eligible_users AS (
      SELECT "id"
      FROM "users"
      WHERE "is_deleted" = false
        AND "status" = 'active'
    )
    INSERT INTO "user_roles" ("user_id", "role_id", "created_at", "updated_at")
    SELECT eligible_users."id", site_role."id", now(), now()
    FROM eligible_users
    CROSS JOIN site_role
    WHERE NOT EXISTS (
      SELECT 1
      FROM "user_roles" existing_user_roles
      WHERE existing_user_roles."user_id" = eligible_users."id"
        AND existing_user_roles."role_id" = site_role."id"
        AND existing_user_roles."revoked_at" IS NULL
    )
  `;

  console.log(`Assigned site role to ${assigned} active users.`);
}
