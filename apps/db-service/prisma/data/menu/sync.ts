import type { PrismaClient } from '../../../generated/prisma/client';
import { ID_PREFIX, createId } from '../id';
import { DEFAULT_PERMISSIONS } from './data';

/**
 * 以 DEFAULT_PERMISSIONS 为准覆盖式同步：库里不在种子数据中的权限（含后台手动新增的）全部删除，
 * 其 role_permissions 关联由外键级联删除。
 * 必须在 upsert 之后执行：upsert 会先把种子里的节点挂回种子父节点，剩下的废弃节点只会互相引用或挂在种子节点下。
 * parent_id 外键是 ON DELETE RESTRICT，同一条 DELETE 里父子一起删也会报错，只能逐层从叶子删起。
 */
async function removeStalePermissions(prisma: PrismaClient): Promise<void> {
  const seedCodes = DEFAULT_PERMISSIONS.map((permission) => permission.code);
  const stale = await prisma.permission.findMany({
    where: { code: { notIn: seedCodes } },
    select: { id: true, code: true, parentId: true },
  });

  if (stale.length === 0) {
    console.log('✓ 没有需要清理的废弃权限');
    return;
  }

  // 先按层算出删除批次（每批都是剩余节点里的叶子），再逐批删除
  const batches: string[][] = [];
  let remaining = stale;
  while (remaining.length > 0) {
    const parentIds = new Set(remaining.map((permission) => permission.parentId));
    const leafIds = remaining
      .filter((permission) => !parentIds.has(permission.id))
      .map((permission) => permission.id);
    if (leafIds.length === 0) {
      throw new Error('废弃权限存在循环父子关系，无法清理');
    }
    batches.push(leafIds);
    remaining = remaining.filter((permission) => !leafIds.includes(permission.id));
  }

  await prisma.$transaction(async (tx) => {
    await batches.reduce<Promise<void>>(async (previous, leafIds) => {
      await previous;
      await tx.permission.deleteMany({ where: { id: { in: leafIds } } });
    }, Promise.resolve());
  });

  console.log(
    `✓ 已删除 ${stale.length} 个不在种子数据中的权限：${stale.map((permission) => permission.code).join(', ')}`,
  );
}

/**
 * 菜单 / 权限资源以种子数据为准覆盖式同步。角色与种子内权限的关联由管理员在后台维护，这里不碰；
 * 只有被删除权限的关联会随之级联删除。SUPER_ADMIN 天然拥有全部已启用权限，新增菜单无需分配即可看到。
 */
export async function seedMenus(prisma: PrismaClient): Promise<void> {
  console.log('开始初始化菜单数据...');

  const permissionIdsByCode = new Map<string, string>();
  // 逐条串行：子节点要等父节点落库拿到 id
  await DEFAULT_PERMISSIONS.reduce<Promise<void>>(async (previous, permission) => {
    await previous;
    const parentId = permission.parentCode
      ? permissionIdsByCode.get(permission.parentCode)
      : undefined;
    if (permission.parentCode && !parentId) {
      throw new Error(`Parent permission not found: ${permission.parentCode}`);
    }

    const data = {
      name: permission.name,
      description: permission.description,
      type: permission.type,
      path: permission.path ?? null,
      icon: permission.icon ?? null,
      isShow: permission.isShow ?? true,
      enable: permission.enable ?? true,
      keepAlive: permission.keepAlive ?? false,
      sort: permission.sort ?? 0,
      isSystem: true,
      parentId: parentId ?? null,
    };
    const saved = await prisma.permission.upsert({
      where: { code: permission.code },
      update: data,
      create: { id: createId(ID_PREFIX.permission), code: permission.code, ...data },
      select: { id: true },
    });
    permissionIdsByCode.set(permission.code, saved.id);
  }, Promise.resolve());
  console.log(`✓ 已初始化 ${DEFAULT_PERMISSIONS.length} 个权限`);

  await removeStalePermissions(prisma);
  console.log('菜单数据初始化完成！');
}
