import { DEFAULT_PERMISSIONS } from '../menu/data';
import { RoleCode } from '../system-roles';

export const DEFAULT_ROLES = [
  {
    code: RoleCode.SUPER_ADMIN,
    name: '超级管理员',
    description: '超级管理员，拥有全部权限',
    isSystem: true,
    permissionCodes: DEFAULT_PERMISSIONS.map((permission) => permission.code),
  },
  {
    code: RoleCode.VISITOR,
    name: '访客',
    description: '访客，只能进入工作台',
    isSystem: false,
    permissionCodes: ['ADMIN'],
  },
];
