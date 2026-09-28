declare namespace IApiAdmin {
  /** 管理端权限资源类型：directory / menu 生成侧边栏，button 是按钮 / 接口级权限码 */
  type PermissionKind =
    | 'directory'
    | 'menu'
    | 'button'
    | 'system'
    | 'module'
    | 'page'
    | 'operation'
    | 'data';

  /** 管理端权限资源节点，与 db-service 的 Permission 表结构一致 */
  interface ResourceNode {
    id: string;
    code: string;
    name: string;
    description: string | null;
    path: string | null;
    icon: string | null;
    isShow: boolean;
    enable: boolean;
    keepAlive: boolean;
    sort: number;
    type: PermissionKind;
    isSystem: boolean;
    parentId: string | null;
    createdAt: string;
    updatedAt: string;
    children?: ResourceNode[];
  }

  /** 当前登录的系统账号：系统用户只有登录账号，没有邮箱 */
  interface AuthAccount {
    id: string;
    account: string;
    username: string | null;
    nickname: string | null;
    avatar: string | null;
    roles: string[];
    permissions: string[];
    createdAt: string;
    updatedAt: string;
  }

  type RoleStatus = 'ENABLED' | 'DISABLED';

  interface RoleRef {
    id: string;
    code: string;
    name: string;
  }

  interface RbacRole extends RoleRef {
    description: string | null;
    remark: string | null;
    enable: boolean;
    status: RoleStatus;
    isSystem: boolean;
    permissions: Array<Pick<ResourceNode, 'id' | 'code' | 'name'>>;
    userCount: number;
    createdAt: string;
    updatedAt: string;
  }

  interface RbacUser {
    id: string;
    account: string;
    username: string | null;
    nickname: string | null;
    avatar: string | null;
    remark: string | null;
    status: IApiUsers.UserStatus;
    lastLoginAt: string | null;
    createdAt: string;
    updatedAt: string;
    roles: RoleRef[];
  }

  type RoleUser = Pick<
    RbacUser,
    'id' | 'account' | 'avatar' | 'createdAt' | 'lastLoginAt' | 'nickname' | 'status' | 'username'
  >;

  /** 平台用户只有正常、受限、已封禁、已停用四种状态 */
  type PlatformUserStatus = 'active' | 'restricted' | 'banned' | 'inactive';

  interface PlatformUser {
    id: string;
    email: string | null;
    nickname: string | null;
    avatar: string | null;
    bio: string | null;
    status: PlatformUserStatus;
    statusReason: string | null;
    statusExpiresAt: string | null;
    lastLoginAt: string | null;
    createdAt: string;
    updatedAt: string;
  }

  interface PlatformUserStatusPayload {
    status: PlatformUserStatus;
    reason?: string | null;
    expiresAt?: string | null;
  }

  interface PermissionListParams {
    tree?: boolean;
    searchTerm?: string;
    type?: PermissionKind;
    page?: number;
    pageSize?: number;
  }

  interface PermissionPayload {
    code: string;
    name: string;
    description?: string | null;
    type: PermissionKind;
    parentId?: string | null;
    path?: string | null;
    icon?: string | null;
    isShow?: boolean;
    enable?: boolean;
    keepAlive?: boolean;
    sort?: number;
  }

  interface RolePayload {
    code: string;
    name: string;
    description?: string;
    remark?: string;
    enable?: boolean;
    permissionIds?: string[];
  }

  interface CreateUserPayload {
    account: string;
    password: string;
    username: string;
    nickname?: string | null;
    remark?: string | null;
    status?: IApiUsers.UserStatus;
    roleIds: string[];
  }

  interface UpdateUserPayload {
    account?: string;
    username?: string | null;
    nickname?: string | null;
    avatar?: string | null;
    remark?: string | null;
    status?: IApiUsers.UserStatus;
  }

  interface SystemSettings {
    allowRegistration: boolean;
    byokAllowedOrigins: string;
    defaultLanguage: 'en-US' | 'zh-CN';
    displayName: string;
    maintenanceMode: boolean;
    sessionPolicy: 'standard' | 'strict';
    supportEmail: string;
    updatedAt: string;
  }

  type SystemSettingsPayload = Omit<SystemSettings, 'updatedAt'>;

  interface AiProviderOption {
    apiKeyUrl?: string;
    chatBaseUrl: string;
    enabled: boolean;
    label: string;
    models: string[];
    protocol: AiProviderProtocol;
    value: string;
  }

  type AiProviderProtocol = 'chat-completions' | 'generate-content' | 'messages';

  interface ThirdPartyServiceOption {
    apiKeyUrl?: string;
    enabled: boolean;
    label: string;
    value: string;
  }
}
