import { z } from 'zod';

/** 大写常量格式：大写字母开头，单词之间用下划线连接，与 db-service createPermissionSchema 一致 */
const PERMISSION_CODE_PATTERN = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;
const PERMISSION_CODE_MESSAGE = '使用大写常量格式：大写字母开头，单词之间用下划线连接';

/** 可选文本：空串归一化为 null，与服务端「空串等于清空」的口径一致 */
function optionalText(max: number, message: string) {
  return z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => value || null);
}

/** 与 db-service createPermissionSchema 的规则保持一致 */
export const permissionFormSchema = z.object({
  name: z.string('请输入权限名称').trim().min(1, '请输入权限名称').max(100, '最多 100 个字符'),
  code: z
    .string(PERMISSION_CODE_MESSAGE)
    .trim()
    .toUpperCase()
    .regex(PERMISSION_CODE_PATTERN, PERMISSION_CODE_MESSAGE)
    .max(100, '最多 100 个字符'),
  type: z.enum(
    ['directory', 'menu', 'button', 'system', 'module', 'page', 'operation', 'data'],
    '请选择权限类型',
  ),
  parentId: z
    .string()
    .nullish()
    .transform((value) => value || null),
  path: optionalText(255, '路由地址最多 255 个字符'),
  icon: optionalText(100, '图标名最多 100 个字符'),
  sort: z.number('排序需为非负整数').int('排序需为非负整数').min(0, '排序需为非负整数'),
  isShow: z.boolean(),
  enable: z.boolean(),
  keepAlive: z.boolean(),
  description: optionalText(255, '说明最多 255 个字符'),
});

export type PermissionFormValues = z.input<typeof permissionFormSchema>;
