import type { PrismaClient } from '../../../generated/prisma/client';
import { DEFAULT_ROLES } from './data';

async function loadPermissionIdsByCode(prisma: PrismaClient): Promise<Map<string, string>> {
  const permissions = await prisma.permission.findMany({ select: { id: true, code: true } });
  return new Map(permissions.map((permission) => [permission.code, permission.id]));
}

// 写库前整体校验：边校验边写的话，半路失败会留下部分角色已重置、部分未动的中间态
function assertRolePermissionsExist(permissionIdsByCode: Map<string, string>): void {
  for (const roleData of DEFAULT_ROLES) {
    const missingCodes = roleData.permissionCodes.filter((code) => !permissionIdsByCode.has(code));
    if (missingCodes.length > 0) {
      throw new Error(
        `Role ${roleData.name} references missing permission(s): ${missingCodes.join(', ')}. ` +
          'Seed menus before roles.',
      );
    }
  }
}

// 以 DEFAULT_ROLES 为准覆盖种子角色：名称、描述与权限关联全部重置为种子值，
// 管理员在后台对这些角色做过的调整会被覆盖。返回角色 id，供清理废弃系统角色时排除。
async function upsertDefaultRole(
  prisma: PrismaClient,
  roleData: (typeof DEFAULT_ROLES)[number],
  permissionIdsByCode: Map<string, string>,
): Promise<string> {
  const existingRole = await prisma.role.findFirst({
    where: { OR: [{ code: roleData.code }, { name: roleData.name }] },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  const data = {
    code: roleData.code,
    enable: true,
    name: roleData.name,
    description: roleData.description,
    remark: roleData.description,
    isSystem: roleData.isSystem,
    status: 'ENABLED' as const,
  };
  const role = existingRole
    ? await prisma.role.update({ where: { id: existingRole.id }, data, select: { id: true } })
    : await prisma.role.create({ data, select: { id: true } });
  const permissionIds = roleData.permissionCodes.map((code) => permissionIdsByCode.get(code)!);

  await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
    await tx.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
    });
  });
  console.log(`✓ 角色 [${roleData.name}] 已初始化，包含 ${roleData.permissionCodes.length} 个权限`);
  return role.id;
}

// 种子角色之间互不依赖，并发写入；任一失败都中断，避免在部分角色未初始化时继续清理
async function upsertDefaultRoles(
  prisma: PrismaClient,
  permissionIdsByCode: Map<string, string>,
): Promise<string[]> {
  const results = await Promise.allSettled(
    DEFAULT_ROLES.map((roleData) => upsertDefaultRole(prisma, roleData, permissionIdsByCode)),
  );
  return results.map((result) => {
    if (result.status === 'rejected') throw result.reason;
    return result.value;
  });
}

/**
 * 删除已从 DEFAULT_ROLES 中移除的系统角色，其 role_permissions / user_roles 由外键级联删除。
 * 只清理 isSystem = true 的角色：后台新建的角色 isSystem 为 false，连同它的用户绑定一起保留。
 */
async function removeStaleSystemRoles(
  prisma: PrismaClient,
  seededRoleIds: string[],
): Promise<void> {
  const stale = await prisma.role.findMany({
    where: { isSystem: true, id: { notIn: seededRoleIds } },
    select: { id: true, code: true, _count: { select: { userRoles: true } } },
  });

  if (stale.length === 0) {
    console.log('✓ 没有需要清理的废弃系统角色');
    return;
  }

  await prisma.role.deleteMany({ where: { id: { in: stale.map((role) => role.id) } } });
  console.log(
    `✓ 已删除 ${stale.length} 个不在种子数据中的系统角色：${stale
      .map((role) => `${role.code}（解绑 ${role._count.userRoles} 个用户）`)
      .join('、')}`,
  );
}

// 角色只挂在系统用户上（与平台用户分表，平台用户天然挂不上），这里只提示进不了后台的系统账号
async function warnSystemUsersWithoutRoles(prisma: PrismaClient): Promise<void> {
  const systemUsersWithoutRoles = await prisma.systemUser.count({
    where: { userRoles: { none: {} } },
  });
  if (systemUsersWithoutRoles > 0) {
    console.warn(
      `⚠ ${systemUsersWithoutRoles} 个后台账号没有任何角色，无法进入后台，请在用户管理中重新分配`,
    );
  }
}

export async function seedRoles(prisma: PrismaClient): Promise<void> {
  console.log('开始初始化角色数据...');

  const permissionIdsByCode = await loadPermissionIdsByCode(prisma);
  assertRolePermissionsExist(permissionIdsByCode);
  const seededRoleIds = await upsertDefaultRoles(prisma, permissionIdsByCode);
  await removeStaleSystemRoles(prisma, seededRoleIds);
  await warnSystemUsersWithoutRoles(prisma);

  console.log('角色数据初始化完成！');
}
