import { Link } from 'react-router';
import { Button, Popconfirm, Space, Switch, Tag, type TableColumnsType } from 'antd';
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
import pageCss from '@/styles/page.module.scss';
import { formatDateTime } from '@/utils';

const { USER } = PERMISSION_CODE.OPERATION;

export function getDisplayName(user: Pick<RbacUser, 'account' | 'nickname' | 'username'>) {
  return user.username || user.nickname || user.account || '未命名用户';
}

export function renderStatusTag(status: string) {
  const meta = getUserStatusMeta(status);
  return <Tag color={meta?.color ?? 'default'}>{meta?.label ?? status}</Tag>;
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
  onRemove: (user: RbacUser) => Promise<boolean>;
  onResetPassword: (user: RbacUser) => void;
  onToggleState: (user: RbacUser, enabled: boolean) => Promise<boolean>;
}

/**
 * 系统用户列表的列定义。
 *
 * 行内操作要用到页面的权限判定、当前登录账号与列表刷新，所以这里导出工厂函数而不是模块级常量。
 */
export function getUserColumns({
  can,
  currentUserId,
  operatorIsSuperAdmin,
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
          <span className={pageCss.muted}>{user.account}</span>
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
          renderStatusTag(user.status)
        ),
    },
    {
      title: '最近登录',
      dataIndex: 'lastLoginAt',
      width: 160,
      render: (value: string | null) => (
        <span className={pageCss.muted}>{formatDateTime(value)}</span>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (value: string) => <span className={pageCss.muted}>{formatDateTime(value)}</span>,
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
          <div className={pageCss.actions}>
            <Link to={`/system/user/detail/${user.id}`}>
              <Button icon={<EyeOutlined />} size="small" type="link">
                查看
              </Button>
            </Link>
            {can(USER.EDIT) ? (
              <Link to={`/system/user/edit/${user.id}`}>
                <Button
                  disabled={lockedForOperator}
                  icon={<EditOutlined />}
                  size="small"
                  type="link"
                >
                  编辑
                </Button>
              </Link>
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
