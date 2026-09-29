import { Badge, Button, Popconfirm, Space, Switch, Tag, type TableColumnsType } from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  KeyOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { PERMISSION_CODE } from '@ai/constants/permissions';
import { RoleCode } from '@ai/constants/roles';
import type { RbacUser } from '@/api/methods/rbac';
import { EMPTY_PLACEHOLDER } from '@/constants/biz';
import { getUserStatusMeta } from '@/constants/user';
import css from '@/components/resource-page/index.module.scss';
import { formatDateTime } from '@/utils/date';

const { USER } = PERMISSION_CODE.OPERATION;

export function getDisplayName(user: Pick<RbacUser, 'account' | 'nickname' | 'username'>) {
  return user.username || user.nickname || user.account || '未命名用户';
}

/** 状态用状态点表达，Tag 只留给角色这类分类标签 */
export function renderStatusBadge(status: string) {
  const meta = getUserStatusMeta(status);
  return <Badge status={meta?.badge ?? 'default'} text={meta?.label ?? status} />;
}

/** bootstrap 配置出来的超级管理员不允许在后台改状态、改角色或删除 */
export function isBootstrapAdmin(user: Pick<RbacUser, 'roles'>): boolean {
  return user.roles.some((role) => role.code === RoleCode.SUPER_ADMIN);
}

interface ColumnsOptions {
  /** 按钮级权限判定，来自 usePermission */
  can: (...codes: string[]) => boolean;
  /** 当前登录用户 id，用于禁止对自己改状态或删除 */
  currentUserId?: string;
  /** 操作者自己是否超管，决定能否改超管账号 */
  operatorIsSuperAdmin: boolean;
  onDetail: (user: RbacUser) => void;
  onEdit: (user: RbacUser) => void;
  onRemove: (user: RbacUser) => Promise<boolean>;
  onResetPassword: (user: RbacUser) => void;
  onToggleState: (user: RbacUser, enabled: boolean) => Promise<boolean>;
}

/**
 * 系统用户列表的列定义。
 *
 * 行内操作要用到页面的权限判定、当前登录账号与列表刷新，所以这里导出工厂函数而不是模块级常量。
 */
export function getColumns({
  can,
  currentUserId,
  operatorIsSuperAdmin,
  onDetail,
  onEdit,
  onRemove,
  onResetPassword,
  onToggleState,
}: ColumnsOptions): TableColumnsType<RbacUser> {
  const isSelf = (user: RbacUser) => user.id === currentUserId;

  return [
    {
      title: '用户',
      key: 'user',
      width: 220,
      fixed: 'left',
      render: (_, user) => (
        <Space orientation="vertical" size={0}>
          <strong>{getDisplayName(user)}</strong>
          <span className={css.muted}>{user.account}</span>
        </Space>
      ),
    },
    {
      title: '角色',
      dataIndex: 'roles',
      width: 220,
      render: (_, user) =>
        user.roles.length ? (
          <Space size={[4, 4]} wrap>
            {user.roles.map((role) => (
              <Tag key={role.id} icon={<SafetyCertificateOutlined />}>
                {role.name}
              </Tag>
            ))}
          </Space>
        ) : (
          EMPTY_PLACEHOLDER
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (_, user) =>
        user.status === 'active' || user.status === 'inactive' ? (
          <Switch
            checked={user.status === 'active'}
            checkedChildren="启用"
            disabled={isBootstrapAdmin(user) || isSelf(user) || !can(USER.SET_STATE)}
            unCheckedChildren="停用"
            onChange={(checked) => {
              onToggleState(user, checked).catch(() => undefined);
            }}
          />
        ) : (
          renderStatusBadge(user.status)
        ),
    },
    {
      title: '最近登录',
      dataIndex: 'lastLoginAt',
      width: 180,
      render: (value: string | null) => <span className={css.muted}>{formatDateTime(value)}</span>,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 180,
      render: (value: string) => <span className={css.muted}>{formatDateTime(value)}</span>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 280,
      fixed: 'right',
      render: (_, user) => {
        const protectedUser = isBootstrapAdmin(user) || isSelf(user);
        // 超管账号只有超管自己能改资料和密码，与服务端 UsersService 的口径一致
        const lockedForOperator = isBootstrapAdmin(user) && !operatorIsSuperAdmin;
        return (
          <div className={css.actions}>
            <Button icon={<EyeOutlined />} size="small" type="link" onClick={() => onDetail(user)}>
              查看
            </Button>
            {can(USER.EDIT) ? (
              <Button
                disabled={lockedForOperator}
                icon={<EditOutlined />}
                size="small"
                type="link"
                onClick={() => onEdit(user)}
              >
                编辑
              </Button>
            ) : null}
            {can(USER.RESET_PASSWORD) ? (
              <Button
                disabled={lockedForOperator}
                icon={<KeyOutlined />}
                size="small"
                type="link"
                onClick={() => onResetPassword(user)}
              >
                重置密码
              </Button>
            ) : null}
            {can(USER.DELETE) ? (
              <Popconfirm
                cancelText="取消"
                description="删除后无法恢复，并会移除该用户的角色关联。"
                disabled={protectedUser}
                okText="删除"
                title={`删除「${getDisplayName(user)}」吗？`}
                onConfirm={() => onRemove(user)}
              >
                <Button
                  danger
                  disabled={protectedUser}
                  icon={<DeleteOutlined />}
                  size="small"
                  type="link"
                >
                  删除
                </Button>
              </Popconfirm>
            ) : null}
          </div>
        );
      },
    },
  ];
}
