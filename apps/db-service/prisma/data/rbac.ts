import type { PrismaClient } from '../../generated/prisma/client';
import { seedMenus } from './menu/sync';
import { seedRoles } from './role/sync';
import { RoleCode } from './system-roles';

/**
 * RBAC 是否已初始化：SUPER_ADMIN 角色存在且至少绑定了一个权限。
 * 后一条捕捉「表建好了但种子从没跑完」的半初始化状态。只回答初始化与否，不逐个核对权限码：
 * 那种清单每次在 menu/data.ts 新增权限都得同步补一行，漏补反而会让新权限永远进不了库。
 */
async function isRbacInitialized(prisma: PrismaClient): Promise<boolean> {
  const bindings = await prisma.rolePermission.count({
    where: { role: { code: RoleCode.SUPER_ADMIN } },
  });
  return bindings > 0;
}

/**
 * 菜单与角色种子的部署口径：
 * - 库还没初始化时自动按 菜单 → 角色 的依赖顺序初始化；
 * - 已初始化时默认跳过，避免每次部署都把后台对菜单、系统角色的调整覆盖掉；
 * - 需要刷新时显式设置 FORCE_MENU_SEED / FORCE_ROLE_SEED=true（部署 workflow 手动触发时的勾选项），
 *   两个都开时仍按 菜单 → 角色 执行（角色种子会校验引用的权限码已存在）。
 */
export async function seedRbac(prisma: PrismaClient): Promise<void> {
  const forceMenu = process.env.FORCE_MENU_SEED === 'true';
  const forceRole = process.env.FORCE_ROLE_SEED === 'true';

  if (!(await isRbacInitialized(prisma))) {
    console.log('RBAC 数据尚未初始化，按 菜单 → 角色 执行初始化');
    await seedMenus(prisma);
    await seedRoles(prisma);
    return;
  }

  if (!forceMenu && !forceRole) {
    console.log(
      'RBAC 数据已存在，跳过菜单与角色种子。需要刷新时设置 FORCE_MENU_SEED / FORCE_ROLE_SEED=true，' +
        '或执行 prisma:seed:menu / prisma:seed:role',
    );
    return;
  }
  if (forceMenu) await seedMenus(prisma);
  if (forceRole) await seedRoles(prisma);
}
