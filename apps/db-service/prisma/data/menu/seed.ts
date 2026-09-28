import { assertTablesExist, runSeed } from '../client';
import { seedMenus } from './sync';

// 单独刷新菜单 / 按钮资源：以 data.ts 为准覆盖式同步，库里多出来的资源（含后台手动新增的）连同角色关联一起删除。
// 新增了权限码、想让种子角色也带上时，接着执行 prisma:seed:role。
runSeed('菜单种子数据', async (prisma) => {
  await assertTablesExist(prisma, ['permissions', 'role_permissions'], 'prisma:seed:menu');
  await seedMenus(prisma);
});
