import { assertTablesExist, runSeed } from '../client';
import { seedRoles } from './sync';

// 单独刷新种子角色：名称、描述与权限关联重置为 data.ts 的值，已从种子移除的系统角色被删除，后台新建的角色保留。
// 依赖菜单种子里的权限码，新增权限码时先执行 prisma:seed:menu。
runSeed('角色种子数据', async (prisma) => {
  await assertTablesExist(
    prisma,
    ['permissions', 'role_permissions', 'roles', 'user_roles', 'system_users'],
    'prisma:seed:role',
  );
  await seedRoles(prisma);
});
