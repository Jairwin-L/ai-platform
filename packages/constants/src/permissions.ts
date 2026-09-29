/**
 * @file
 * 管理端授权使用的权限码。
 *
 * 权限码统一使用大写常量格式：大写字母开头，单词之间用 `_` 连接（如 `USER_RESET_PASSWORD`），
 * 与 apps/db-service/prisma/data/menu/data.ts 及菜单管理表单的校验规则保持一致。
 * 平台注册用户没有角色体系，这里只有管理端（系统用户）的权限码。
 */

export const PERMISSION_CODE = {
  /**
   * 按钮 / 操作级权限码。
   * 管理端接口鉴权（AdminPermissionAuth）与按钮显隐都引用这里，
   * 新增时同步 apps/db-service/prisma/data/menu/data.ts，否则无法在角色里勾选。
   */
  OPERATION: {
    PLATFORM_USER: {
      READ: 'PLATFORM_USER_READ',
      WRITE_PERMISSION: 'PLATFORM_USER_WRITE_PERMISSION',
    },
    USER: {
      READ: 'USER_READ',
      CREATE: 'USER_CREATE',
      EDIT: 'USER_EDIT',
      DELETE: 'USER_DELETE',
      SET_STATE: 'USER_SET_STATE',
      RESET_PASSWORD: 'USER_RESET_PASSWORD',
      ASSIGN_ROLE: 'USER_ASSIGN_ROLE',
    },
    ROLE: {
      READ: 'ROLE_READ',
      CREATE: 'ROLE_CREATE',
      EDIT: 'ROLE_EDIT',
      DELETE: 'ROLE_DELETE',
      SET_STATE: 'ROLE_SET_STATE',
      ASSIGN_USER: 'ROLE_ASSIGN_USER',
    },
    PERMISSION: {
      READ: 'PERMISSION_READ',
      /** 编码沿用历史命名，实际覆盖菜单资源的新增、编辑、启停与删除 */
      ASSIGN: 'PERMISSION_ASSIGN',
    },
    SETTINGS: {
      READ: 'SETTINGS_READ',
      WRITE: 'SETTINGS_WRITE',
    },
    AI_PROVIDER: {
      READ: 'AI_PROVIDER_READ',
      WRITE: 'AI_PROVIDER_WRITE',
    },
    THIRD_PARTY_SERVICE: {
      READ: 'THIRD_PARTY_SERVICE_READ',
      WRITE: 'THIRD_PARTY_SERVICE_WRITE',
    },
  },
} as const;
