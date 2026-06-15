import { prisma } from '@/lib/prisma';

export async function isAdmin(userId?: string): Promise<boolean> {
  if (!userId) {
    return false;
  }

  try {
    const adminRole = await prisma.userRoles.findFirst({
      where: {
        user_id: userId,
        role: {
          name: 'admin',
        },
      },
    });

    return Boolean(adminRole);
  } catch (error) {
    console.error('Unable to verify administrator access:', error);
    return false;
  }
}

export async function hasPermission(
  userId?: string,
  permissionCode?: string,
): Promise<boolean> {
  if (!userId || !permissionCode) {
    return false;
  }

  try {
    const userRoles = await prisma.userRoles.findMany({
      where: { user_id: userId },
      include: {
        role: {
          include: {
            role_permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    for (const userRole of userRoles) {
      for (const rolePermission of userRole.role.role_permissions) {
        if (rolePermission.permission.code === permissionCode) {
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.error(`Unable to verify permission ${permissionCode}:`, error);
    return false;
  }
}

export async function getUserPermissions(userId?: string): Promise<string[]> {
  if (!userId) {
    return [];
  }

  try {
    const userRoles = await prisma.userRoles.findMany({
      where: { user_id: userId },
      include: {
        role: {
          include: {
            role_permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    const permissions = new Set<string>();
    for (const userRole of userRoles) {
      for (const rolePermission of userRole.role.role_permissions) {
        if (rolePermission.permission.code) {
          permissions.add(rolePermission.permission.code);
        }
      }
    }

    return Array.from(permissions);
  } catch (error) {
    console.error('Unable to load user permission codes:', error);
    return [];
  }
}
