import { ADMIN_ROLE_CODES } from '@/constants';
import { prisma } from '@/lib/prisma';

export async function isAdmin(userId?: string): Promise<boolean> {
  if (!userId) {
    return false;
  }

  const now = new Date();

  try {
    const adminRole = await prisma.userRoles.findFirst({
      where: {
        user_id: userId,
        revoked_at: null,
        AND: [
          { OR: [{ valid_from: null }, { valid_from: { lte: now } }] },
          { OR: [{ valid_until: null }, { valid_until: { gt: now } }] },
        ],
        role: {
          code: { in: [...ADMIN_ROLE_CODES] },
          status: 'ENABLED',
        },
      },
    });

    return Boolean(adminRole);
  } catch (error) {
    console.error('无法验证管理员访问权限：', error);
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
    const now = new Date();
    const userRoles = await prisma.userRoles.findMany({
      where: {
        user_id: userId,
        revoked_at: null,
        AND: [
          { OR: [{ valid_from: null }, { valid_from: { lte: now } }] },
          { OR: [{ valid_until: null }, { valid_until: { gt: now } }] },
        ],
        role: { status: 'ENABLED' },
      },
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
    console.error(`无法验证权限 ${permissionCode}：`, error);
    return false;
  }
}

export async function getUserPermissions(userId?: string): Promise<string[]> {
  if (!userId) {
    return [];
  }

  try {
    const now = new Date();
    const userRoles = await prisma.userRoles.findMany({
      where: {
        user_id: userId,
        revoked_at: null,
        AND: [
          { OR: [{ valid_from: null }, { valid_from: { lte: now } }] },
          { OR: [{ valid_until: null }, { valid_until: { gt: now } }] },
        ],
        role: { status: 'ENABLED' },
      },
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
    console.error('无法加载用户权限编码：', error);
    return [];
  }
}
