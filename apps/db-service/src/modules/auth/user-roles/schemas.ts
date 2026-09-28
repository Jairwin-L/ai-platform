import { z } from 'zod';
import { requiredIdParam } from '@/common/schemas/params';
import { requiredQueryText } from '@/common/schemas/query';

/** 查某个系统用户的角色 */
export const userRolesQuery = z.object({ id: requiredQueryText('用户 id 不能为空') });

/**
 * 改某个系统用户的角色。
 *
 * roleIds 允许空数组（表示清空角色），但元素必须是非空字符串；重复项去掉。
 */
export const updateUserRolesSchema = z
  .object({
    userId: requiredIdParam('userId 不能为空'),
    roleIds: z.array(z.string().trim().min(1)).transform((ids) => Array.from(new Set(ids))),
  })
  .strict();

export type UserRolesQuery = z.infer<typeof userRolesQuery>;
export type UpdateUserRolesInput = z.infer<typeof updateUserRolesSchema>;
