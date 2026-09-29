import type { PrismaClient } from '../../generated/prisma/client';
import { assertTablesExist, runSeed } from './client';
import { ID_PREFIX, createId } from './id';
import { hashPassword } from './password';
import { RoleCode } from './system-roles';

const REQUIRED_TABLES = ['roles', 'user_roles', 'system_users'];
/** 与后台新建系统用户的账号规则一致 */
const ACCOUNT_PATTERN = /^[a-zA-Z0-9_.@-]{1,100}$/;
const MIN_PASSWORD_LENGTH = 6;

interface BootstrapAdminConfig {
  account: string;
  password: string;
  resetPassword: boolean;
}

/**
 * 读取并校验首个超级管理员的配置。账号与密码只来自环境变量，仓库里不保留任何默认值：
 * 两者都没配置时跳过；只配了一个视为配置错误，直接失败，避免部署时误以为已经建好了管理员。
 */
function readConfig(): BootstrapAdminConfig | null {
  const account = process.env.BOOTSTRAP_ADMIN_ACCOUNT?.trim() ?? '';
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? '';

  if (!account && !password) return null;
  if (!account || !password) {
    throw new Error('BOOTSTRAP_ADMIN_ACCOUNT and BOOTSTRAP_ADMIN_PASSWORD must be set together.');
  }
  if (!ACCOUNT_PATTERN.test(account)) {
    throw new Error('BOOTSTRAP_ADMIN_ACCOUNT may only contain letters, digits, _ . @ - (max 100).');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`BOOTSTRAP_ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  return {
    account,
    password,
    resetPassword: process.env.BOOTSTRAP_ADMIN_RESET_PASSWORD === 'true',
  };
}

/**
 * 保证配置的账号是可用的超级管理员：
 * - 账号不存在时创建，并只挂 SUPER_ADMIN；
 * - 已存在时补上 SUPER_ADMIN、恢复为 active，不改其他角色；
 * - 默认不覆盖已有账号的密码（部署每次都会执行这里），显式设置 BOOTSTRAP_ADMIN_RESET_PASSWORD=true 才重置。
 */
async function ensureBootstrapAdmin(prisma: PrismaClient, config: BootstrapAdminConfig) {
  const superRole = await prisma.role.findUnique({
    where: { code: RoleCode.SUPER_ADMIN },
    select: { id: true },
  });
  if (!superRole) {
    throw new Error('SUPER_ADMIN role is not initialized. Run "prisma:seed" first.');
  }

  const existing = await prisma.systemUser.findUnique({
    where: { account: config.account },
    select: { id: true },
  });

  if (!existing) {
    await prisma.systemUser.create({
      data: {
        id: createId(ID_PREFIX.systemUser),
        account: config.account,
        password: await hashPassword(config.password),
        username: config.account,
        nickname: config.account,
        status: 'active',
        userRoles: { create: { id: createId(ID_PREFIX.userRole), roleId: superRole.id } },
      },
      select: { id: true },
    });
    console.log('✓ 已创建超级管理员账号');
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.systemUser.update({
      where: { id: existing.id },
      data: {
        status: 'active',
        ...(config.resetPassword ? { password: await hashPassword(config.password) } : {}),
      },
      select: { id: true },
    });
    await tx.userRole.createMany({
      data: [{ id: createId(ID_PREFIX.userRole), userId: existing.id, roleId: superRole.id }],
      skipDuplicates: true,
    });
  });
  console.log(
    config.resetPassword
      ? '✓ 超级管理员账号已存在：已确保 SUPER_ADMIN 角色并重置密码'
      : '✓ 超级管理员账号已存在：已确保 SUPER_ADMIN 角色，密码保持不变',
  );
}

// 依赖 SUPER_ADMIN 角色，全新库需先执行 prisma:seed。
// 账号与密码不会打印到日志，也不要写进仓库里的任何文件。
runSeed('超级管理员初始化', async (prisma) => {
  const config = readConfig();
  if (!config) {
    console.log('BOOTSTRAP_ADMIN_ACCOUNT / BOOTSTRAP_ADMIN_PASSWORD are not set. Skipping.');
    return;
  }

  await assertTablesExist(prisma, REQUIRED_TABLES, 'prisma:bootstrap-admin');
  await ensureBootstrapAdmin(prisma, config);
});
