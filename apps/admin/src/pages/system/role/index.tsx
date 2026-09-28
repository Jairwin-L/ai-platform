import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Input, Select, Table } from 'antd';
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { PERMISSION_CODE } from '@ai/constants/permissions';
import { deleteRbacRole, getRbacRolePage, updateRbacRole, type RbacRole } from '@/api/methods/rbac';
import RoleUserAssignModal from '@/components/role-user-assign-modal';
import { usePermission, useTable, type AdminTableQuery } from '@/hooks';
import pageCss from '@/styles/page.module.scss';
import { getRoleColumns } from './columns';

const ENABLE_FILTER_OPTIONS = [
  { label: '启用', value: 'true' },
  { label: '停用', value: 'false' },
];

export default function RoleListPage() {
  const navigate = useNavigate();
  const can = usePermission();
  // 未选表示不按状态筛选
  const [filterEnable, setFilterEnable] = useState<boolean>();
  const [assignRole, setAssignRole] = useState<RbacRole | null>(null);
  const filters = useMemo(() => ({ enable: filterEnable }), [filterEnable]);

  const fetcher = useCallback(
    async ({ page, pageSize, searchTerm }: AdminTableQuery) => {
      const result = await getRbacRolePage({ page, pageSize, searchTerm, enable: filterEnable });
      return { list: result.data, total: result.total };
    },
    [filterEnable],
  );
  const table = useTable<RbacRole>({ fetcher, filters });
  const { reload, runAction } = table;

  const columns = useMemo(
    () =>
      getRoleColumns({
        can,
        onEdit: (role) => {
          void navigate(`/system/role/edit/${role.id}`);
        },
        onOpenAssignUser: setAssignRole,
        onRemove: (role) => runAction(() => deleteRbacRole(role.id)),
        onToggleState: (role) => runAction(() => updateRbacRole(role.id, { enable: !role.enable })),
      }),
    [can, navigate, runAction],
  );

  const onCloseAssignModal = (saved: boolean) => {
    setAssignRole(null);
    // 关联用户数跟着变了
    if (saved) reload().catch(() => undefined);
  };

  return (
    <div className={pageCss.page}>
      <section className={pageCss.heading}>
        <div>
          <h1>角色管理</h1>
          <p>维护系统职责、每个职责可授予的菜单与按钮权限，以及角色下的系统用户。</p>
        </div>
        {can(PERMISSION_CODE.OPERATION.ROLE.CREATE) ? (
          <Button
            icon={<PlusOutlined />}
            type="primary"
            onClick={() => navigate('/system/role/create')}
          >
            新建角色
          </Button>
        ) : null}
      </section>
      <section className={pageCss.panel}>
        <div className={pageCss.filters}>
          <Input.Search
            allowClear
            className={pageCss.search}
            enterButton={<SearchOutlined />}
            placeholder="按角色名称、编码或说明搜索"
            value={table.searchInput}
            onChange={(event) => table.setSearchInput(event.target.value)}
            onSearch={table.submitSearch}
          />
          <Select<string>
            allowClear
            options={ENABLE_FILTER_OPTIONS}
            placeholder="全部状态"
            style={{ width: 140 }}
            value={filterEnable === undefined ? undefined : String(filterEnable)}
            onChange={(value?: string) =>
              setFilterEnable(value === undefined ? undefined : value === 'true')
            }
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              reload().catch(() => undefined);
            }}
          >
            刷新
          </Button>
        </div>
        <div className={pageCss.table}>
          <Table<RbacRole>
            columns={columns}
            dataSource={table.list}
            loading={table.loading}
            rowKey="id"
            scroll={{ x: 1100 }}
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
      <RoleUserAssignModal role={assignRole} onClose={onCloseAssignModal} />
    </div>
  );
}
