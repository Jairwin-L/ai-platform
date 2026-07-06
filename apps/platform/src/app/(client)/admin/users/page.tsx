'use client';

import {
  CheckCircleOutlined,
  EditOutlined,
  EyeOutlined,
  MailOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  StopOutlined,
  UserAddOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Avatar,
  Button,
  Input,
  message,
  Select,
  Space,
  Table,
  Tag,
  type TableColumnsType,
} from 'antd';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { getRoles, type AdminRole } from '@/api/modules/admin';
import { getUsers, updateUser, type UserListItem, type UserStatus } from '@/api/modules/users';
import styles from './page.module.scss';

const pageSize = 10;
const statusOptions: Array<{ color: string; label: string; value: UserStatus }> = [
  { color: 'success', label: '正常', value: 'active' },
  { color: 'warning', label: '待激活', value: 'pending' },
  { color: 'warning', label: '受限', value: 'restricted' },
  { color: 'error', label: '已封禁', value: 'banned' },
  { color: 'default', label: '已停用', value: 'inactive' },
];

function getDisplayName(user: UserListItem): string {
  return user.full_name || user.nick_name || user.user_name || user.email || '未命名用户';
}

function getStatusTag(status: string) {
  const option = statusOptions.find((item) => item.value === status);

  return <Tag color={option?.color ?? 'default'}>{option?.label ?? status}</Tag>;
}

function formatDate(value: string | null): string {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<UserStatus | 'all'>('active');
  const [filterRole, setFilterRole] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);

    const [usersResult, rolesResult] = await Promise.allSettled([
      getUsers({ page, pageSize, searchTerm, status: filterStatus, role: filterRole }),
      getRoles({ page: 1, pageSize: 100 }),
    ]);

    if (usersResult.status === 'fulfilled') {
      setUsers(usersResult.value.data);
      setTotal(usersResult.value.total);
    } else {
      setUsers([]);
      setTotal(0);
    }

    if (rolesResult.status === 'fulfilled') {
      setRoles(rolesResult.value.data);
    }

    setLoading(false);
  }, [filterRole, filterStatus, page, searchTerm]);

  useEffect(() => {
    loadData().catch(() => undefined);
  }, [loadData]);

  async function updateUserStatus(user: UserListItem, status: UserStatus) {
    try {
      await updateUser(user.id, { status });
      await loadData();
    } catch {
      // 请求错误由 alova 全局提示处理。
    }
  }

  const columns: TableColumnsType<UserListItem> = [
    {
      title: '用户',
      key: 'user',
      width: 240,
      fixed: 'left',
      render: (_, user) => (
        <Space align="center" size={10}>
          <Avatar icon={<UserOutlined />} src={user.picture || undefined}>
            {getDisplayName(user).slice(0, 1)}
          </Avatar>
          <Space orientation="vertical" size={0}>
            <strong>{getDisplayName(user)}</strong>
            <span className={styles.muted}>{user.user_name || user.id}</span>
          </Space>
        </Space>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      width: 240,
      render: (email: string | null, user) => (
        <Space size={6}>
          <MailOutlined />
          <span>{email || '—'}</span>
          {user.email_verified && <Tag color="processing">已验证</Tag>}
        </Space>
      ),
    },
    {
      title: '角色',
      dataIndex: 'roles',
      width: 190,
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
          '—'
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 104,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '最近登录',
      dataIndex: 'last_login_at',
      width: 176,
      render: (value: string | null) => <span className={styles.muted}>{formatDate(value)}</span>,
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      width: 176,
      render: (value: string) => <span className={styles.muted}>{formatDate(value)}</span>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 210,
      fixed: 'right',
      render: (_, user) => (
        <Space size={2}>
          <Link aria-label={`查看 ${getDisplayName(user)}`} href={`/admin/users/${user.id}`}>
            <Button icon={<EyeOutlined />} size="small" type="text" />
          </Link>
          <Link aria-label={`编辑 ${getDisplayName(user)}`} href={`/admin/users/${user.id}/edit`}>
            <Button icon={<EditOutlined />} size="small" type="text" />
          </Link>
          {user.status === 'active' ? (
            <Button
              danger
              icon={<StopOutlined />}
              size="small"
              type="text"
              onClick={() => {
                updateUserStatus(user, 'banned').catch(() => undefined);
              }}
            >
              封禁
            </Button>
          ) : (
            <Button
              icon={<CheckCircleOutlined />}
              size="small"
              type="text"
              onClick={() => {
                updateUserStatus(user, 'active').catch(() => undefined);
              }}
            >
              启用
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <main className={styles.page}>
      <section className={styles.heading}>
        <div>
          <h1>
            <UserOutlined /> 用户管理
          </h1>
          <p>查看、筛选和维护系统用户的资料、角色与账号状态。</p>
        </div>
        <Space>
          <Button
            icon={<UserAddOutlined />}
            onClick={() => {
              message.info('用户由注册功能创建，不能在管理端直接新增。');
            }}
          >
            新增用户
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              loadData().catch(() => undefined);
            }}
          >
            刷新
          </Button>
        </Space>
      </section>
      <section className={styles.panel}>
        <div className={styles.filters}>
          <Input.Search
            allowClear
            className={styles.search}
            enterButton={<SearchOutlined />}
            placeholder="按姓名、用户名或邮箱搜索"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onSearch={(value) => {
              setPage(1);
              setSearchTerm(value.trim());
            }}
          />
          <Select
            options={[
              { label: '全部状态', value: 'all' },
              ...statusOptions.map(({ label, value }) => ({ label, value })),
            ]}
            value={filterStatus}
            onChange={(value) => {
              setPage(1);
              setFilterStatus(value as UserStatus | 'all');
            }}
          />
          <Select
            allowClear
            options={roles.map((role) => ({ label: role.name, value: role.code }))}
            placeholder="全部角色"
            value={filterRole}
            onChange={(value) => {
              setPage(1);
              setFilterRole(value);
            }}
          />
        </div>
        <div className={styles.table}>
          <Table
            columns={columns}
            dataSource={users}
            loading={loading}
            pagination={{
              current: page,
              pageSize,
              showSizeChanger: false,
              showTotal: (value) => `共 ${value} 位用户`,
              total,
              onChange: setPage,
            }}
            rowKey="id"
            scroll={{ x: 1320 }}
          />
        </div>
      </section>
    </main>
  );
}
