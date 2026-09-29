declare namespace IApiAuth {
  type AuthCodePurpose = 'sign-in' | 'sign-up';

  /** 平台注册用户：没有角色体系；受限用户能登录，状态字段用于提示为什么不能操作 */
  interface AuthUser {
    email: string | null;
    emailVerified: boolean | null;
    id: string;
    nickName: string | null;
    picture: string | null;
    status: IApiUsers.UserStatus;
    /** 限制 / 停用 / 封禁原因 */
    statusReason: string | null;
    /** 受限 / 封禁截止时间（ISO），为空表示需后台手动恢复 */
    statusExpiresAt: string | null;
  }

  interface AuthPayload {
    user: AuthUser;
  }
}
