import { seedAiProviders } from './ai-providers';
import { assertTablesExist, runSeed } from './client';
import { seedRbac } from './rbac';
import { seedThirdPartyServices } from './third-party-services';

const REQUIRED_TABLES = [
  'permissions',
  'roles',
  'role_permissions',
  'user_roles',
  'system_users',
  'ai_providers',
  'third_party_services',
];

// 部署每次都会执行：RBAC 只在未初始化或显式强制时写入（见 rbac.ts），
// AI Provider 与第三方服务选项按种子值同步
runSeed('种子数据', async (prisma) => {
  await assertTablesExist(prisma, REQUIRED_TABLES, 'prisma:seed');
  await seedRbac(prisma);
  await seedAiProviders(prisma);
  await seedThirdPartyServices(prisma);
});
