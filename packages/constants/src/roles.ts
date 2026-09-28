export enum RoleCode {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  SITE_USER = 'SITE_USER',
  OPERATOR = 'OPERATOR',
  APPROVER = 'APPROVER',
  AUDITOR = 'AUDITOR',
  READ_ONLY = 'READ_ONLY',
}

export const SYSTEM_ROLE_CODES = Object.values(RoleCode);

export const ADMIN_ROLE_CODES = [RoleCode.SUPER_ADMIN, RoleCode.ADMIN] as const;
