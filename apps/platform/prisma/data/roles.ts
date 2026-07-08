import type { PrismaClient } from '../../generated/prisma/client';
import { throwIfRejected } from './promise-results';
import { RoleCode } from './system-roles';

interface RoleSeed {
  code: RoleCode;
  description: string;
  legacyNames: string[];
  name: string;
}

const SYSTEM_ROLE_SEEDS: RoleSeed[] = [
  {
    code: RoleCode.SUPER_ADMIN,
    name: '超级管理员',
    description: '系统最高权限角色',
    legacyNames: ['super_admin', 'SUPER_ADMIN'],
  },
  {
    code: RoleCode.ADMIN,
    name: '管理员',
    description: '后台业务管理员',
    legacyNames: ['admin', 'ADMIN'],
  },
  {
    code: RoleCode.SITE_USER,
    name: '站点用户',
    description: '默认拥有站点全部功能权限',
    legacyNames: ['site_user', 'SITE_USER'],
  },
  {
    code: RoleCode.OPERATOR,
    name: '操作员',
    description: '日常业务操作员',
    legacyNames: ['operator', 'OPERATOR'],
  },
  {
    code: RoleCode.APPROVER,
    name: '审批员',
    description: '审批人员',
    legacyNames: ['approver', 'APPROVER'],
  },
  {
    code: RoleCode.AUDITOR,
    name: '审计员',
    description: '审计人员',
    legacyNames: ['auditor', 'AUDITOR'],
  },
  {
    code: RoleCode.READ_ONLY,
    name: '只读用户',
    description: '普通只读角色',
    legacyNames: ['user', 'visitor', 'read_only', 'USER', 'VISITOR', 'READ_ONLY'],
  },
];

async function upsertSystemRole(prisma: PrismaClient, role: RoleSeed): Promise<void> {
  const legacyRole = await prisma.roles.findFirst({
    where: {
      OR: [{ code: role.code }, { name: { in: role.legacyNames } }],
    },
    orderBy: { id: 'asc' },
  });

  if (legacyRole) {
    await prisma.roles.update({
      where: { id: legacyRole.id },
      data: {
        code: role.code,
        name: role.name,
        description: role.description,
        is_system: true,
        status: 'ENABLED',
        updated_at: new Date(),
      },
    });
    return;
  }

  await prisma.roles.create({
    data: {
      code: role.code,
      name: role.name,
      description: role.description,
      is_system: true,
      status: 'ENABLED',
    },
  });
}

export async function seedRoles(prisma: PrismaClient): Promise<void> {
  console.log('Seeding roles...');

  const roleResults = await Promise.allSettled(
    SYSTEM_ROLE_SEEDS.map((role) => upsertSystemRole(prisma, role)),
  );
  throwIfRejected(roleResults);

  await prisma.$executeRaw`
    SELECT setval(pg_get_serial_sequence('roles', 'id'), COALESCE((SELECT MAX(id) FROM roles), 0) + 1, false)
  `;
  console.log(`Seeded ${SYSTEM_ROLE_SEEDS.length} roles.`);
}
