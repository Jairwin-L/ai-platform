export enum RoleCode {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  VISITOR = 'VISITOR',
  OPERATOR = 'OPERATOR',
  APPROVER = 'APPROVER',
  AUDITOR = 'AUDITOR',
  READ_ONLY = 'READ_ONLY',
}

export const SYSTEM_ROLE_CODES = Object.values(RoleCode);

/** 超级管理员：直接放行全部权限码，角色绑定只能通过 bootstrap 配置 */
export const ADMIN_ROLE_CODES = [RoleCode.SUPER_ADMIN] as const;
