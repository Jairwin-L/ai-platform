import type { PermissionType, PrismaClient } from '../../generated/prisma/client';

interface PermissionData {
  name: string;
  code: string;
  parentCode: string | null;
  type: PermissionType;
  description: string | null;
}

const permissionsData: PermissionData[] = [
  {
    name: 'Articles',
    code: 'ARTICLES',
    parentCode: null,
    type: 'module',
    description: '文章管理模块',
  },
  {
    name: 'Article Management',
    code: 'ARTICLES:MANAGEMENT',
    parentCode: 'ARTICLES',
    type: 'page',
    description: '文章管理页面',
  },
  {
    name: 'Articles:View',
    code: 'ARTICLES:VIEW',
    parentCode: 'ARTICLES:MANAGEMENT',
    type: 'operation',
    description: '文章管理:查看',
  },
  {
    name: 'Articles:Add',
    code: 'ARTICLES:ADD',
    parentCode: 'ARTICLES:MANAGEMENT',
    type: 'operation',
    description: '文章管理:新增',
  },
  {
    name: 'Articles:Edit',
    code: 'ARTICLES:EDIT',
    parentCode: 'ARTICLES:MANAGEMENT',
    type: 'operation',
    description: '文章管理:编辑',
  },
  {
    name: 'Articles:Delete',
    code: 'ARTICLES:DELETE',
    parentCode: 'ARTICLES:MANAGEMENT',
    type: 'operation',
    description: '文章管理:删除',
  },
];

export async function seedPermissions(prisma: PrismaClient): Promise<void> {
  console.log('Seeding permissions...');
  const seededPermissions = await permissionsData.reduce<
    Promise<Array<{ code: string; id: number }>>
  >(async (previousSeededPermissions, permission) => {
    const existingPermissions = await previousSeededPermissions;
    const permissionIdsByCode = new Map(
      existingPermissions.map((existingPermission) => [
        existingPermission.code,
        existingPermission.id,
      ]),
    );
    const parent_id = permission.parentCode ? permissionIdsByCode.get(permission.parentCode) : null;

    if (permission.parentCode && typeof parent_id !== 'number') {
      throw new Error(
        `Parent permission not found for ${permission.code}: ${permission.parentCode}`,
      );
    }

    const seededPermission = await prisma.permissions.upsert({
      where: { code: permission.code },
      update: {
        name: permission.name,
        code: permission.code,
        parent_id,
        type: permission.type,
        description: permission.description,
        updated_at: new Date(),
      },
      create: {
        name: permission.name,
        code: permission.code,
        parent_id,
        type: permission.type,
        description: permission.description,
      },
      select: { id: true, code: true },
    });

    return [...existingPermissions, seededPermission];
  }, Promise.resolve([]));

  await prisma.$executeRaw`
    SELECT setval(pg_get_serial_sequence('permissions', 'id'), COALESCE((SELECT MAX(id) FROM permissions), 0) + 1, false)
  `;
  console.log(`Seeded ${seededPermissions.length} permissions.`);
}
