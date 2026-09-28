import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  Button,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  type TableColumnsType,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { deletePermission, getPermissions, type AdminPermission } from '@/api/methods/rbac';
import { EMPTY_PLACEHOLDER } from '@/constants/biz';
import { PERMISSION_TYPE_OPTIONS, getPermissionTypeMeta } from '@/constants/permission';
import { useLiteDebounced } from '@/hooks';
import pageCss from '@/styles/page.module.scss';
import { formatDateTime } from '@/utils';

type PermissionTypeFilter = IApiAdmin.PermissionType | 'all';

const TYPE_FILTER_OPTIONS = [
  { label: '全部类型', value: 'all' },
  ...PERMISSION_TYPE_OPTIONS.map(({ label, value }) => ({ label, value })),
];

export default function PermissionListPage() {
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<PermissionTypeFilter>('all');
  const [loading, setLoading] = useState(true);

  const loadPermissions = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getPermissions({
        tree: true,
        page: 1,
        pageSize: 1000,
        searchTerm,
        type: filterType,
      });
      setPermissions(result.data);
      setTotal(result.total);
    } catch {
      setPermissions([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filterType, searchTerm]);

  useEffect(() => {
    loadPermissions().catch(() => undefined);
  }, [loadPermissions]);

  const onRemove = useCallback(
    async (permission: AdminPermission) => {
      try {
        await deletePermission(permission.id);
        await loadPermissions();
      } catch {
        // 请求错误由全局响应拦截器提示
      }
    },
    [loadPermissions],
  );
  const onRefresh = useLiteDebounced(() => {
    void loadPermissions();
  });

  const onSearch = (value: string) => {
    setSearchTerm(value.trim());
  };

  const columns = useMemo<TableColumnsType<AdminPermission>>(
    () => [
      {
        title: '权限名称',
        dataIndex: 'name',
        width: 280,
        render: (name: string, permission) => (
          <Space orientation="vertical" size={2}>
            <strong>{name}</strong>
            <code className={pageCss.code}>{permission.code}</code>
          </Space>
        ),
      },
      {
        title: '类型',
        dataIndex: 'type',
        width: 100,
        render: (type: string) => {
          const meta = getPermissionTypeMeta(type);
          return <Tag color={meta?.color}>{meta?.label ?? type}</Tag>;
        },
      },
      {
        title: '说明',
        dataIndex: 'description',
        render: (value: string | null) => (
          <span className={pageCss.muted}>{value || EMPTY_PLACEHOLDER}</span>
        ),
      },
      {
        title: '更新时间',
        dataIndex: 'updated_at',
        width: 170,
        render: (value?: string) => <span className={pageCss.muted}>{formatDateTime(value)}</span>,
      },
      {
        title: '操作',
        key: 'actions',
        width: 140,
        fixed: 'right',
        render: (_, permission) => (
          <div className={pageCss.actions}>
            <Tooltip title="添加子权限">
              <Link to={`/system/permission/create?parentId=${permission.id}`}>
                <Button icon={<PlusOutlined />} size="small" type="text" />
              </Link>
            </Tooltip>
            <Tooltip title="编辑">
              <Link to={`/system/permission/edit/${permission.id}`}>
                <Button icon={<EditOutlined />} size="small" type="text" />
              </Link>
            </Tooltip>
            <Popconfirm
              cancelText="取消"
              description="删除后无法恢复，并会移除所有角色上的该权限；存在子权限时会被拒绝。"
              okText="删除"
              title={`删除「${permission.name}」吗？`}
              onConfirm={() => onRemove(permission)}
            >
              <Button danger icon={<DeleteOutlined />} size="small" type="text" />
            </Popconfirm>
          </div>
        ),
      },
    ],
    [onRemove],
  );

  return (
    <div className={pageCss.page}>
      <section className={pageCss.heading}>
        <div>
          <h1>权限管理</h1>
          <p>按页面、模块、操作和数据层级维护访问控制。</p>
        </div>
        <Link to="/system/permission/create">
          <Button icon={<PlusOutlined />} type="primary">
            新建权限
          </Button>
        </Link>
      </section>
      <section className={pageCss.panel}>
        <div className={pageCss.filters}>
          <Input.Search
            allowClear
            className={pageCss.search}
            enterButton={<SearchOutlined />}
            placeholder="按名称、编码或说明搜索"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onSearch={onSearch}
          />
          <Select
            style={{ width: 140 }}
            options={TYPE_FILTER_OPTIONS}
            value={filterType}
            onChange={(value) => setFilterType(value as PermissionTypeFilter)}
          />
          <Button icon={<ReloadOutlined />} onClick={onRefresh}>
            刷新
          </Button>
        </div>
        <div className={pageCss.table}>
          <Table
            columns={columns}
            dataSource={permissions}
            expandable={{ defaultExpandAllRows: true }}
            loading={loading}
            pagination={false}
            rowKey="id"
            scroll={{ x: 960 }}
            footer={() => <span className={pageCss.muted}>共 {total} 项权限</span>}
          />
        </div>
      </section>
    </div>
  );
}
