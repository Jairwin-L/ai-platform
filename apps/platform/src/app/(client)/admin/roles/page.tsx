'use client';

import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import {
  Alert,
  App,
  Button,
  Input,
  Popconfirm,
  Space,
  Table,
  Tag,
  type TableColumnsType,
} from 'antd';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { deleteRole, getRoles, type AdminRole } from '@/services/admin';
import styles from '../resource-page.module.scss';

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '请求未能完成';
}

export default function RolesPage() {
  const { message } = App.useApp();
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRoles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getRoles({ page, pageSize: 10, searchTerm });
      setRoles(result.data);
      setTotal(result.total);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  async function removeRole(role: AdminRole) {
    try {
      await deleteRole(role.id);
      message.success('角色已删除');
      if (roles.length === 1 && page > 1) {
        setPage((value) => value - 1);
      } else {
        await loadRoles();
      }
    } catch (requestError) {
      message.error(getErrorMessage(requestError));
    }
  }

  const columns: TableColumnsType<AdminRole> = [
    {
      title: '角色名称',
      dataIndex: 'name',
      width: 220,
      render: (name: string, role) => (
        <Space orientation="vertical" size={2}>
          <strong>{name}</strong>
          {role.is_system && <Tag color="blue">系统角色</Tag>}
        </Space>
      ),
    },
    {
      title: '说明',
      dataIndex: 'description',
      render: (description: string | null) => (
        <span className={styles.muted}>{description || '—'}</span>
      ),
    },
    { title: '关联用户', dataIndex: 'user_count', width: 112, align: 'center' },
    { title: '授权数量', dataIndex: 'permission_count', width: 112, align: 'center' },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      width: 176,
      render: (value: string) => <span className={styles.muted}>{formatDate(value)}</span>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 112,
      fixed: 'right',
      render: (_, role) => (
        <div className={styles.actions}>
          <Link aria-label={`编辑 ${role.name}`} href={`/admin/roles/${role.id}/edit`}>
            <Button icon={<EditOutlined />} size="small" type="text" />
          </Link>
          <Popconfirm
            cancelText="取消"
            description="删除后无法恢复，且会移除该角色的授权关联。"
            disabled={role.is_system}
            okText="删除"
            title={`删除“${role.name}”吗？`}
            onConfirm={async () => {
              await removeRole(role);
            }}
          >
            <Button
              aria-label={`删除 ${role.name}`}
              danger
              disabled={role.is_system}
              icon={<DeleteOutlined />}
              size="small"
              type="text"
            />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <main className={styles.page}>
      <section className={styles.heading}>
        <div>
          <h1>
            <TeamOutlined /> 角色管理
          </h1>
          <p>维护系统职责以及每个职责可授予的权限范围。</p>
        </div>
        <Link href="/admin/roles/create">
          <Button icon={<PlusOutlined />} type="primary">
            新建角色
          </Button>
        </Link>
      </section>

      {error && (
        <Alert
          className={styles.alert}
          description={error}
          showIcon
          title="无法加载角色"
          type="error"
        />
      )}

      <section className={styles.panel}>
        <div className={styles.filters}>
          <Input.Search
            allowClear
            className={styles.search}
            enterButton={<SearchOutlined />}
            placeholder="按角色名称或说明搜索"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onSearch={(value) => {
              setPage(1);
              setSearchTerm(value.trim());
            }}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={async () => {
              await loadRoles();
            }}
          >
            刷新
          </Button>
        </div>
        <div className={styles.table}>
          <Table
            columns={columns}
            dataSource={roles}
            loading={loading}
            pagination={{
              current: page,
              pageSize: 10,
              showSizeChanger: false,
              showTotal: (value) => `共 ${value} 个角色`,
              total,
              onChange: setPage,
            }}
            rowKey="id"
            scroll={{ x: 920 }}
          />
        </div>
      </section>
    </main>
  );
}
