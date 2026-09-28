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
    name: 'AI',
    code: 'AI',
    parentCode: null,
    type: 'module',
    description: 'AI 模块',
  },
  {
    name: 'AI Chat',
    code: 'AI:CHAT',
    parentCode: 'AI',
    type: 'page',
    description: 'AI Chat 页面',
  },
  {
    name: 'AI Chat:Use',
    code: 'AI:CHAT:USE',
    parentCode: 'AI:CHAT',
    type: 'operation',
    description: 'AI Chat:使用',
  },
  {
    name: 'AI Settings',
    code: 'AI:SETTINGS',
    parentCode: 'AI',
    type: 'page',
    description: 'AI 设置页面',
  },
  {
    name: 'AI Settings:View',
    code: 'AI:SETTINGS:VIEW',
    parentCode: 'AI:SETTINGS',
    type: 'operation',
    description: 'AI 设置:查看',
  },
  {
    name: 'AI Settings:Manage',
    code: 'AI:SETTINGS:MANAGE',
    parentCode: 'AI:SETTINGS',
    type: 'operation',
    description: 'AI 设置:管理',
  },
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
  {
    name: 'Upload',
    code: 'UPLOAD',
    parentCode: null,
    type: 'module',
    description: '上传模块',
  },
  {
    name: 'Upload Management',
    code: 'UPLOAD:MANAGEMENT',
    parentCode: 'UPLOAD',
    type: 'page',
    description: '上传管理页面',
  },
  {
    name: 'Upload:Create',
    code: 'UPLOAD:CREATE',
    parentCode: 'UPLOAD:MANAGEMENT',
    type: 'operation',
    description: '上传管理:上传文件',
  },
  {
    name: 'Upload:Compress',
    code: 'UPLOAD:COMPRESS',
    parentCode: 'UPLOAD:MANAGEMENT',
    type: 'operation',
    description: '上传管理:压缩图片',
  },
];

export const SITE_PERMISSION_CODES = permissionsData.map((permission) => permission.code);

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
