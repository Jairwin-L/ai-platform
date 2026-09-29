import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Input, Popconfirm, Select, Table } from 'antd';
import {
  DeleteOutlined,
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { PERMISSION_CODE } from '@ai/constants/permissions';
import {
  deleteRbacUser,
  deleteRbacUsers,
  getRbacRoles,
  getRbacUsers,
  updateRbacUser,
  type RbacRole,
  type RbacUser,
} from '@/api/methods/rbac';
import { SELECT_OPTION } from '@/constants/antd';
import { usePermission, useTable, useTableScrollHeight, type AdminTableQuery } from '@/hooks';
import { isAdminRole, useAuthStore } from '@/stores/auth';
import Exception from '@/components/exception';
import css from '@/components/resource-page/index.module.scss';
import { getColumns, isBootstrapAdmin } from './columns';
import ResetPasswordModal from './reset-password-modal';

const { USER } = PERMISSION_CODE.OPERATION;

export default function Page() {
  const navigate = useNavigate();
  const can = usePermission();
  const currentUser = useAuthStore((state) => state.currentUser);
  const operatorIsSuperAdmin = isAdminRole(currentUser?.roles);
  const { scrollY, tableRef } = useTableScrollHeight();
  const [roles, setRoles] = useState<RbacRole[]>([]);
  // 未选表示不按角色筛选
  const [filterRole, setFilterRole] = useState<string>();
  const [passwordUser, setPasswordUser] = useState<RbacUser | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filters = useMemo(() => ({ roleId: filterRole }), [filterRole]);
  const fetcher = useCallback(
    async ({ page, pageSize, searchTerm }: AdminTableQuery) => {
      const response = await getRbacUsers({ page, pageSize, searchTerm, roleId: filterRole });
      return { list: response.data?.data ?? [], total: response.data?.total ?? 0 };
    },
    [filterRole],
  );

  const {
    list: users,
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
  } = useTable<RbacUser>({ fetcher, filters });

  // 翻页、筛选、删除后列表会换一批数据，勾选只对当前页仍存在的行生效
  const visibleSelectedIds = selectedIds.filter((id) => users.some((user) => user.id === id));
  const isSelf = (user: RbacUser) => user.id === currentUser?.id;

  // 角色下拉只用于筛选，与列表分页无关，单独拉一次即可
  useEffect(() => {
    getRbacRoles()
      .then((response) => setRoles(response.data ?? []))
      .catch(() => setRoles([]));
  }, []);

  const onToggleState = (user: RbacUser, enabled: boolean) =>
    runAction(() => updateRbacUser(user.id, { status: enabled ? 'active' : 'inactive' }));

  const onRemove = (user: RbacUser) => runAction(() => deleteRbacUser(user.id));

  const onDetail = (user: RbacUser) => {
    void navigate(`/system/user/detail/${user.id}`);
  };

  const onEdit = (user: RbacUser) => {
    void navigate(`/system/user/edit/${user.id}`);
  };

  const onRemoveSelectedUsers = async () => {
    if (await runAction(() => deleteRbacUsers(visibleSelectedIds))) setSelectedIds([]);
  };

  const onCloseResetPassword = () => {
    setPasswordUser(null);
  };

  const columns = getColumns({
    can,
    currentUserId: currentUser?.id,
    operatorIsSuperAdmin,
    onDetail,
    onEdit,
    onRemove,
    onResetPassword: setPasswordUser,
    onToggleState,
  });

  if (loadFailed) return <Exception onClick={reload} />;

  return (
    <main className={css.page}>
      <section className={css.heading}>
        <div>
          <h1>
            <TeamOutlined /> 用户管理
          </h1>
          <p>维护管理端系统用户的资料、账号状态、角色与密码；前台注册用户见「平台用户」。</p>
        </div>
        {can(USER.CREATE) ? (
          <Button
            icon={<UserAddOutlined />}
            type="primary"
            onClick={() => navigate('/system/user/create')}
          >
            新增用户
          </Button>
        ) : null}
      </section>

      <section className={css.panel}>
        <div className={css.filters}>
          <Input.Search
            allowClear
            className={css.search}
            enterButton={<SearchOutlined />}
            placeholder="按账号、用户名或昵称搜索"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onSearch={submitSearch}
          />
          <Select
            {...SELECT_OPTION}
            options={roles.map((role) => ({ label: role.name, value: role.id }))}
            placeholder="请选择角色"
            style={{ width: 180 }}
            value={filterRole}
            onChange={setFilterRole}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              reload().catch(() => undefined);
            }}
          >
            刷新
          </Button>
          {can(USER.DELETE) ? (
            <Popconfirm
              cancelText="取消"
              description="删除后无法恢复，并会移除这些用户的角色关联。"
              disabled={visibleSelectedIds.length === 0}
              okText="删除"
              title={`删除选中的 ${visibleSelectedIds.length} 个用户吗？`}
              onConfirm={onRemoveSelectedUsers}
            >
              <Button danger disabled={visibleSelectedIds.length === 0} icon={<DeleteOutlined />}>
                批量删除
              </Button>
            </Popconfirm>
          ) : null}
        </div>
        <div ref={tableRef} className="table-viewport">
          <Table<RbacUser>
            rowKey="id"
            columns={columns}
            dataSource={users}
            loading={loading}
            rowSelection={
              can(USER.DELETE)
                ? {
                    selectedRowKeys: visibleSelectedIds,
                    // 超管与当前登录用户服务端不允许删除，勾选了只会让整批失败
                    getCheckboxProps: (user) => ({
                      disabled: isBootstrapAdmin(user) || isSelf(user),
                    }),
                    onChange: (keys) => setSelectedIds(keys.map(String)),
                  }
                : undefined
            }
            scroll={{ x: 1240, y: scrollY }}
            pagination={{
              current: page,
              pageSize,
              showSizeChanger: true,
              showTotal: (value) => `共 ${value} 位用户`,
              total,
              onChange: changePagination,
            }}
          />
        </div>
      </section>

      <ResetPasswordModal user={passwordUser} onClose={onCloseResetPassword} />
    </main>
  );
}
