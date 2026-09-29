import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Input, Select, Table } from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { PERMISSION_CODE } from '@ai/constants/permissions';
import { deleteRbacRole, getRbacRolePage, updateRbacRole, type RbacRole } from '@/api/methods/rbac';
import { SELECT_OPTION } from '@/constants/antd';
import { usePermission, useTable, useTableScrollHeight, type AdminTableQuery } from '@/hooks';
import RoleUserAssignModal from '@/components/role-user-assign-modal';
import Exception from '@/components/exception';
import css from '@/components/resource-page/index.module.scss';
import { getColumns } from './columns';

const { ROLE } = PERMISSION_CODE.OPERATION;

const ENABLE_FILTER_OPTIONS = [
  { label: '启用', value: 'true' },
  { label: '停用', value: 'false' },
];

export default function Page() {
  const navigate = useNavigate();
  const can = usePermission();
  const { scrollY, tableRef } = useTableScrollHeight();
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

  const {
    list: roles,
    total,
    page,
    pageSize,
    loading,
    loadFailed,
    searchInput,
    setSearchInput,
    submitSearch,
    changePagination,
    reload,
    runAction,
  } = useTable<RbacRole>({ fetcher, filters });

  const onRemove = (role: RbacRole) => runAction(() => deleteRbacRole(role.id));

  const onToggleState = (role: RbacRole) =>
    runAction(() => updateRbacRole(role.id, { enable: !role.enable }));

  const onEdit = (role: RbacRole) => {
    void navigate(`/system/role/edit/${role.id}`);
  };

  const onCloseAssignModal = (saved: boolean) => {
    setAssignRole(null);
    // 关联用户数跟着变了
    if (saved) reload().catch(() => undefined);
  };

  const columns = getColumns({
    can,
    onEdit,
    onOpenAssignUser: setAssignRole,
    onRemove,
    onToggleState,
  });

  if (loadFailed) return <Exception onClick={reload} />;

  return (
    <main className={css.page}>
      <section className={css.heading}>
        <div>
          <h1>
            <SafetyCertificateOutlined /> 角色管理
          </h1>
          <p>维护系统职责、每个职责可授予的菜单与按钮权限，以及角色下的系统用户。</p>
        </div>
        {can(ROLE.CREATE) ? (
          <Button
            icon={<PlusOutlined />}
            type="primary"
            onClick={() => navigate('/system/role/create')}
          >
            新建角色
          </Button>
        ) : null}
      </section>

      <section className={css.panel}>
        <div className={css.filters}>
          <Input.Search
            allowClear
            className={css.search}
            enterButton={<SearchOutlined />}
            placeholder="按角色名称、编码或说明搜索"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onSearch={submitSearch}
          />
          <Select<string>
            {...SELECT_OPTION}
            options={ENABLE_FILTER_OPTIONS}
            placeholder="请选择状态"
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
        <div ref={tableRef} className="table-viewport">
          <Table<RbacRole>
            rowKey="id"
            columns={columns}
            dataSource={roles}
            loading={loading}
            scroll={{ x: 1100, y: scrollY }}
            pagination={{
              current: page,
              pageSize,
              showSizeChanger: true,
              showTotal: (value) => `共 ${value} 个角色`,
              total,
              onChange: changePagination,
            }}
          />
        </div>
      </section>

      <RoleUserAssignModal role={assignRole} onClose={onCloseAssignModal} />
    </main>
  );
}
