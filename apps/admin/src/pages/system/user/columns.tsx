import { Link } from 'react-router';
import { Avatar, Button, Space, Tag, Tooltip, type TableColumnsType } from 'antd';
import {
  CheckCircleOutlined,
  EditOutlined,
  EyeOutlined,
  SafetyCertificateOutlined,
  StopOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { UserListItem, UserStatus } from '@/api/methods/rbac';
import { EMPTY_PLACEHOLDER } from '@/constants/biz';
import { getUserStatusMeta } from '@/constants/user';
import pageCss from '@/styles/page.module.scss';
import { formatDateTime } from '@/utils';

export function getDisplayName(
  user: Pick<UserListItem, 'full_name' | 'nick_name' | 'user_name' | 'email'>,
) {
  return user.full_name || user.nick_name || user.user_name || user.email || '未命名用户';
}

export function renderStatusTag(status: string) {
  const meta = getUserStatusMeta(status);
  return <Tag color={meta?.color ?? 'default'}>{meta?.label ?? status}</Tag>;
}

interface UserColumnsOptions {
  onChangeStatus: (user: UserListItem, status: UserStatus) => void;
}

export function getUserColumns({
  onChangeStatus,
}: UserColumnsOptions): TableColumnsType<UserListItem> {
  return [
    {
      title: '用户',
      key: 'user',
      width: 240,
      fixed: 'left',
      render: (_, user) => (
        <Space align="center" size={10}>
          <Avatar icon={<UserOutlined />} src={user.picture || undefined} />
          <Space orientation="vertical" size={0}>
            <strong>{getDisplayName(user)}</strong>
            <span className={pageCss.muted}>{user.user_name || user.id}</span>
          </Space>
        </Space>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      width: 260,
      render: (email: string | null, user) => (
        <Space size={6}>
          <span>{email || EMPTY_PLACEHOLDER}</span>
          {user.email_verified ? <Tag color="processing">已验证</Tag> : null}
        </Space>
      ),
    },
    {
      title: '角色',
      dataIndex: 'roles',
      width: 200,
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
      width: 100,
      render: (status: string) => renderStatusTag(status),
    },
    {
      title: '最近登录',
      dataIndex: 'last_login_at',
      width: 170,
      render: (value: string | null) => (
        <span className={pageCss.muted}>{formatDateTime(value)}</span>
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      width: 170,
      render: (value: string) => <span className={pageCss.muted}>{formatDateTime(value)}</span>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_, user) => (
        <Space size={2}>
          <Tooltip title="查看">
            <Link to={`/system/user/detail/${user.id}`}>
              <Button icon={<EyeOutlined />} size="small" type="text" />
            </Link>
          </Tooltip>
          <Tooltip title="编辑">
            <Link to={`/system/user/edit/${user.id}`}>
              <Button icon={<EditOutlined />} size="small" type="text" />
            </Link>
          </Tooltip>
          {user.status === 'active' ? (
            <Button
              danger
              icon={<StopOutlined />}
              size="small"
              type="text"
              onClick={() => onChangeStatus(user, 'banned')}
            >
              封禁
            </Button>
          ) : (
            <Button
              icon={<CheckCircleOutlined />}
              size="small"
              type="text"
              onClick={() => onChangeStatus(user, 'active')}
            >
              启用
            </Button>
          )}
        </Space>
      ),
    },
  ];
}
