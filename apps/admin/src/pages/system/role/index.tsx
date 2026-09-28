import { useCallback, useMemo } from 'react';
import { Link } from 'react-router';
import { Button, Input, Popconfirm, Space, Table, Tag, Tooltip, type TableColumnsType } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { RoleCode } from '@ai/constants/roles';
import { deleteRole, getRoles, type AdminRole } from '@/api/methods/rbac';
import { EMPTY_PLACEHOLDER } from '@/constants/biz';
import { useTable, type AdminTableQuery } from '@/hooks';
import pageCss from '@/styles/page.module.scss';
import { formatDateTime } from '@/utils';

/** 这两个角色只能由 seed / bootstrap 维护，列表里不提供编辑入口 */
const PROTECTED_ROLE_CODES = new Set<string>([RoleCode.SUPER_ADMIN, RoleCode.SITE_USER]);

export default function RoleListPage() {
  const fetcher = useCallback(async ({ page, pageSize, searchTerm }: AdminTableQuery) => {
    const result = await getRoles({ page, pageSize, searchTerm });
    return { list: result.data, total: result.total };
  }, []);
  const table = useTable<AdminRole>({ fetcher });
  const { runAction } = table;

  const columns = useMemo<TableColumnsType<AdminRole>>(
    () => [
      {
        title: '角色',
        dataIndex: 'name',
        width: 240,
        render: (name: string, role) => (
          <Space orientation="vertical" size={2}>
            <strong>{name}</strong>
            <Space size={4} wrap>
              <Tag>{role.code}</Tag>
              {role.is_system ? <Tag color="processing">系统角色</Tag> : null}
              {role.status === 'DISABLED' ? <Tag color="warning">已停用</Tag> : null}
            </Space>
          </Space>
        ),
      },
      {
        title: '说明',
        dataIndex: 'description',
        render: (value: string | null) => (
          <span className={pageCss.muted}>{value || EMPTY_PLACEHOLDER}</span>
        ),
      },
      { title: '关联用户', dataIndex: 'user_count', width: 100, align: 'center' },
      { title: '授权数量', dataIndex: 'permission_count', width: 100, align: 'center' },
      {
        title: '更新时间',
        dataIndex: 'updated_at',
        width: 170,
        render: (value: string) => <span className={pageCss.muted}>{formatDateTime(value)}</span>,
      },
      {
        title: '操作',
        key: 'actions',
        width: 110,
        fixed: 'right',
        render: (_, role) => (
          <div className={pageCss.actions}>
            <Tooltip title={PROTECTED_ROLE_CODES.has(role.code) ? '内置角色由 seed 维护' : '编辑'}>
              <Link to={`/system/role/edit/${role.id}`}>
                <Button
                  disabled={PROTECTED_ROLE_CODES.has(role.code)}
                  icon={<EditOutlined />}
                  size="small"
                  type="text"
                />
              </Link>
            </Tooltip>
            <Popconfirm
              cancelText="取消"
              description="删除后无法恢复，且会移除该角色的授权关联。"
              disabled={role.is_system}
              okText="删除"
              title={`删除「${role.name}」吗？`}
              onConfirm={() => runAction(() => deleteRole(role.id))}
            >
              <Button
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
    ],
    [runAction],
  );

  return (
    <div className={pageCss.page}>
      <section className={pageCss.heading}>
        <div>
          <h1>角色管理</h1>
          <p>维护系统职责以及每个职责可授予的权限范围。</p>
        </div>
        <Link to="/system/role/create">
          <Button icon={<PlusOutlined />} type="primary">
            新建角色
          </Button>
        </Link>
      </section>
      <section className={pageCss.panel}>
        <div className={pageCss.filters}>
          <Input.Search
            allowClear
            className={pageCss.search}
            enterButton={<SearchOutlined />}
            placeholder="按角色编码、名称或说明搜索"
            value={table.searchInput}
            onChange={(event) => table.setSearchInput(event.target.value)}
            onSearch={table.submitSearch}
          />
        </div>
        <div className={pageCss.table}>
          <Table
            columns={columns}
            dataSource={table.list}
            loading={table.loading}
            rowKey="id"
            scroll={{ x: 960 }}
            pagination={{
              current: table.page,
              pageSize: table.pageSize,
              total: table.total,
              showTotal: (total) => `共 ${total} 个角色`,
              onChange: table.changePagination,
            }}
          />
        </div>
      </section>
    </div>
  );
}
