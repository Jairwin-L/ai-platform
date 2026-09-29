/**
 * 种子脚本用到的角色编码，与 @ai/constants/roles 保持一致。
 * Docker 的迁移镜像只拷贝 prisma 目录，读不到 packages 源码，所以在这里单独维护。
 */
export enum RoleCode {
  SUPER_ADMIN = 'SUPER_ADMIN',
  VISITOR = 'VISITOR',
}
