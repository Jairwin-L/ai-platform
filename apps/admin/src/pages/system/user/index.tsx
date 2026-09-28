import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Input, Select, Table } from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import {
  getRoles,
  getUsers,
  updateUser,
  type AdminRole,
  type UserListItem,
  type UserStatus,
} from '@/api/methods/rbac';
import { USER_STATUS_OPTIONS } from '@/constants/user';
import { useLiteDebounced, useTable, type AdminTableQuery } from '@/hooks';
import pageCss from '@/styles/page.module.scss';
import { getUserColumns } from './columns';

const STATUS_FILTER_OPTIONS = [
  { label: '全部状态', value: 'all' },
  ...USER_STATUS_OPTIONS.map(({ label, value }) => ({ label, value })),
];

export default function UserListPage() {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [filterStatus, setFilterStatus] = useState<UserStatus | 'all'>('active');
  const [filterRole, setFilterRole] = useState<string | undefined>();
  const filters = useMemo(
    () => ({ status: filterStatus, role: filterRole }),
    [filterRole, filterStatus],
  );

  const fetcher = useCallback(
    async ({ page, pageSize, searchTerm }: AdminTableQuery) => {
      const result = await getUsers({
        page,
        pageSize,
        searchTerm,
        status: filterStatus,
        role: filterRole,
      });
      return { list: result.data, total: result.total };
    },
    [filterRole, filterStatus],
  );

  const table = useTable<UserListItem>({ fetcher, filters });

  useEffect(() => {
    getRoles({ page: 1, pageSize: 100 })
      .then((result) => setRoles(result.data))
      .catch(() => undefined);
  }, []);

  const onChangeStatus = useLiteDebounced((user: UserListItem, status: UserStatus) => {
    void table.runAction(() => updateUser(user.id, { status }));
  });
  const onRefresh = useLiteDebounced(() => {
    void table.reload();
  });
  const columns = useMemo(() => getUserColumns({ onChangeStatus }), [onChangeStatus]);

  return (
    <div className={pageCss.page}>
      <section className={pageCss.heading}>
        <div>
          <h1>用户管理</h1>
          <p>查看、筛选和维护用户的资料、角色与账号状态。用户由前台注册创建，不能在后台新增。</p>
        </div>
        <Button icon={<ReloadOutlined />} onClick={onRefresh}>
          刷新
        </Button>
      </section>
      <section className={pageCss.panel}>
        <div className={pageCss.filters}>
          <Input.Search
            allowClear
            className={pageCss.search}
            enterButton={<SearchOutlined />}
            placeholder="按姓名、用户名或邮箱搜索"
            value={table.searchInput}
            onChange={(event) => table.setSearchInput(event.target.value)}
            onSearch={table.submitSearch}
          />
          <Select
            style={{ width: 140 }}
            options={STATUS_FILTER_OPTIONS}
            value={filterStatus}
            onChange={(value) => setFilterStatus(value as UserStatus | 'all')}
          />
          <Select
            allowClear
            style={{ width: 180 }}
            options={roles.map((role) => ({ label: role.name, value: role.code }))}
            placeholder="全部角色"
            value={filterRole}
            onChange={setFilterRole}
          />
        </div>
        <div className={pageCss.table}>
          <Table
            columns={columns}
            dataSource={table.list}
            loading={table.loading}
            rowKey="id"
            scroll={{ x: 1300 }}
            pagination={{
              current: table.page,
              pageSize: table.pageSize,
              total: table.total,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 位用户`,
              onChange: table.changePagination,
            }}
          />
        </div>
      </section>
    </div>
  );
}
