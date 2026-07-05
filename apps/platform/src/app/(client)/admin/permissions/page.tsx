'use client';

import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Button, Input, Popconfirm, Select, Space, Table, Tag, type TableColumnsType } from 'antd';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  deletePermission,
  getPermissions,
  type AdminPermission,
  type PermissionType,
} from '@/api/modules/admin';
import styles from './page.module.scss';

const typeColor: Record<PermissionType, string> = {
  system: 'default',
  page: 'processing',
  module: 'processing',
  operation: 'success',
  data: 'warning',
};

const typeLabel: Record<PermissionType, string> = {
  system: '系统',
  page: '页面',
  module: '模块',
  operation: '操作',
  data: '数据',
};

function formatDate(value?: string): string {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<PermissionType | 'all'>('all');
  const [loading, setLoading] = useState(true);

  const loadPermissions = useCallback(async () => {
    setLoading(true);

    try {
      const result = await getPermissions({
        page: 1,
        pageSize: 1000,
        searchTerm,
        tree: true,
        type: filterType,
      });
      setPermissions(result.data);
      setTotal(result.total);
    } catch {
      // 请求错误由 alova 全局提示处理。
    } finally {
      setLoading(false);
    }
  }, [filterType, searchTerm]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  async function removePermission(permission: AdminPermission) {
    try {
      await deletePermission(permission.id);
      await loadPermissions();
    } catch {
      // 请求错误由 alova 全局提示处理。
    }
  }

  const columns: TableColumnsType<AdminPermission> = [
    {
      title: '权限名称',
      dataIndex: 'name',
      width: 260,
      render: (name: string, permission) => (
        <Space orientation="vertical" size={2}>
          <strong>{name}</strong>
          <code className={styles.code}>{permission.code}</code>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 108,
      render: (type: PermissionType) => <Tag color={typeColor[type]}>{typeLabel[type]}</Tag>,
    },
    {
      title: '说明',
      dataIndex: 'description',
      render: (description: string | null) => (
        <span className={styles.muted}>{description || '—'}</span>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      width: 174,
      render: (value?: string) => <span className={styles.muted}>{formatDate(value)}</span>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 146,
      fixed: 'right',
      render: (_, permission) => (
        <div className={styles.actions}>
          <Link
            aria-label={`添加 ${permission.name} 的子权限`}
            href={`/admin/permissions/create?parentId=${permission.id}`}
          >
            <Button icon={<PlusOutlined />} size="small" type="text" />
          </Link>
          <Link
            aria-label={`编辑 ${permission.name}`}
            href={`/admin/permissions/${permission.id}/edit`}
          >
            <Button icon={<EditOutlined />} size="small" type="text" />
          </Link>
          <Popconfirm
            cancelText="取消"
            description="删除后将无法恢复；存在子级或角色关联时接口可能会拒绝该操作。"
            okText="删除"
            title={`删除“${permission.name}”吗？`}
            onConfirm={async () => {
              await removePermission(permission);
            }}
          >
            <Button
              aria-label={`删除 ${permission.name}`}
              danger
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
            <SafetyCertificateOutlined /> 权限管理
          </h1>
          <p>按页面、模块、操作和数据层级维护当前项目的访问控制。</p>
        </div>
        <Link href="/admin/permissions/create">
          <Button icon={<PlusOutlined />} type="primary">
            新建权限
          </Button>
        </Link>
      </section>
      <section className={styles.panel}>
        <div className={styles.filters}>
          <Input.Search
            allowClear
            className={styles.search}
            enterButton={<SearchOutlined />}
            placeholder="按名称、编码或说明搜索"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onSearch={(value) => setSearchTerm(value.trim())}
          />
          <Select
            options={[
              { label: '全部类型', value: 'all' },
              ...Object.entries(typeLabel).map(([value, label]) => ({ label, value })),
            ]}
            value={filterType}
            onChange={(value) => setFilterType(value as PermissionType | 'all')}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={async () => {
              await loadPermissions();
            }}
          >
            刷新
          </Button>
        </div>
        <div className={styles.table}>
          <Table
            columns={columns}
            dataSource={permissions}
            expandable={{ defaultExpandAllRows: true }}
            loading={loading}
            pagination={false}
            rowKey="id"
            scroll={{ x: 930 }}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell colSpan={5} index={0}>
                  <span className={styles.muted}>共 {total} 项权限</span>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        </div>
      </section>
    </main>
  );
}
