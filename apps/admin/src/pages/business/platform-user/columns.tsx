import { Avatar, Badge, Button, Popconfirm, Space, Tooltip, type TableColumnsType } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import type { PlatformUser } from '@/api/methods/rbac';
import { EMPTY_PLACEHOLDER } from '@/constants/biz';
import {
  PLATFORM_USER_STATUS_ACTIONS,
  getUserStatusMeta,
  type PlatformUserStatusAction,
} from '@/constants/user';
import css from '@/components/resource-page/index.module.scss';
import { formatDateTime } from '@/utils/date';

interface ColumnsOptions {
  /** 有 PLATFORM_USER_WRITE_PERMISSION 才出现操作列 */
  canSetState: boolean;
  onOpenStatusModal: (user: PlatformUser, action: PlatformUserStatusAction) => void;
  onRestore: (user: PlatformUser) => Promise<boolean>;
}

export function getDisplayName(user: PlatformUser): string {
  return user.nickname || user.email || '未命名用户';
}

/**
 * 平台注册用户列表的列定义。
 *
 * 行内操作要用到页面的弹窗状态与列表刷新，所以这里导出工厂函数而不是模块级常量。
 */
export function getColumns({
  canSetState,
  onOpenStatusModal,
  onRestore,
}: ColumnsOptions): TableColumnsType<PlatformUser> {
  const actionColumns: TableColumnsType<PlatformUser> = [
    {
      title: '操作',
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_, user) =>
        user.status === 'active' ? (
          <div className={css.actions}>
            {PLATFORM_USER_STATUS_ACTIONS.map((action) => (
              <Button
                key={action.status}
                danger={action.danger}
                size="small"
                type="link"
                onClick={() => onOpenStatusModal(user, action)}
              >
                {action.action}
              </Button>
            ))}
          </div>
        ) : (
          <Popconfirm
            cancelText="取消"
            description="恢复后用户可以正常登录和使用，原因与截止时间会被清空。"
            okText="恢复"
            placement="topRight"
            title={`恢复「${getDisplayName(user)}」为正常状态吗？`}
            onConfirm={() => onRestore(user)}
          >
            <Button size="small" type="link">
              恢复正常
            </Button>
          </Popconfirm>
        ),
    },
  ];

  return [
    {
      title: '用户',
      key: 'user',
      width: 280,
      fixed: 'left',
      render: (_, user) => (
        <Space align="center" size={10}>
          <Avatar icon={<UserOutlined />} src={user.avatar || undefined} />
          <Space orientation="vertical" size={0}>
            <strong>{getDisplayName(user)}</strong>
            <span className={css.muted}>{user.id}</span>
          </Space>
        </Space>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      width: 240,
      render: (email: string | null) => email || EMPTY_PLACEHOLDER,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (status: string, user) => {
        const meta = getUserStatusMeta(status);
        const badge = <Badge status={meta?.badge ?? 'default'} text={meta?.label ?? status} />;
        if (!user.statusReason && !user.statusExpiresAt) return badge;
        return (
          <Tooltip
            title={
              <>
                {user.statusReason ? <div>原因：{user.statusReason}</div> : null}
                <div>
                  解除时间：
                  {user.statusExpiresAt ? formatDateTime(user.statusExpiresAt) : '需手动恢复'}
                </div>
              </>
            }
          >
            <span>{badge}</span>
          </Tooltip>
        );
      },
    },
    {
      title: '最近登录',
      dataIndex: 'lastLoginAt',
      width: 180,
      render: (value: string | null) => <span className={css.muted}>{formatDateTime(value)}</span>,
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      width: 180,
      render: (value: string) => <span className={css.muted}>{formatDateTime(value)}</span>,
    },
    ...(canSetState ? actionColumns : []),
  ];
}
