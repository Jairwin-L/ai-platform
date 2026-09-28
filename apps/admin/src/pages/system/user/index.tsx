import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Input, Popconfirm, Select, Table } from 'antd';
import { DeleteOutlined, ReloadOutlined, SearchOutlined, UserAddOutlined } from '@ant-design/icons';
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
import { usePermission, useTable, type AdminTableQuery } from '@/hooks';
import { isAdminRole, useAuthStore } from '@/stores/auth';
import pageCss from '@/styles/page.module.scss';
import { getUserColumns, isBootstrapAdmin } from './columns';
import ResetPasswordModal from './reset-password-modal';

const { USER } = PERMISSION_CODE.OPERATION;

export default function SystemUserListPage() {
  const navigate = useNavigate();
  const can = usePermission();
  const currentUser = useAuthStore((state) => state.currentUser);
  const operatorIsSuperAdmin = isAdminRole(currentUser?.roles);
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [filterRole, setFilterRole] = useState<string>();
  const [passwordUser, setPasswordUser] = useState<RbacUser | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const filters = useMemo(() => ({ roleId: filterRole }), [filterRole]);

  const fetcher = useCallback(
    async ({ page, pageSize, searchTerm }: AdminTableQuery) => {
      const result = await getRbacUsers({ page, pageSize, searchTerm, roleId: filterRole });
      return { list: result.data, total: result.total };
    },
    [filterRole],
  );
  const table = useTable<RbacUser>({ fetcher, filters });
  const { runAction } = table;
  // 翻页、筛选、删除后列表会换一批数据，勾选只对当前页仍存在的行生效
  const visibleSelectedIds = selectedIds.filter((id) => table.list.some((user) => user.id === id));

  // 角色下拉只用于筛选，与列表分页无关，单独拉一次即可
  useEffect(() => {
    getRbacRoles()
      .then(setRoles)
      .catch(() => setRoles([]));
  }, []);

  const columns = useMemo(
    () =>
      getUserColumns({
        can,
        currentUserId: currentUser?.id,
        operatorIsSuperAdmin,
        onRemove: (user) => runAction(() => deleteRbacUser(user.id)),
        onResetPassword: setPasswordUser,
        onToggleState: (user, enabled) =>
          runAction(() => updateRbacUser(user.id, { status: enabled ? 'active' : 'inactive' })),
      }),
    [can, currentUser?.id, operatorIsSuperAdmin, runAction],
  );

  const onRemoveSelectedUsers = async () => {
    if (await runAction(() => deleteRbacUsers(visibleSelectedIds))) setSelectedIds([]);
  };

  return (
    <div className={pageCss.page}>
      <section className={pageCss.heading}>
        <div>
          <h1>用户管理</h1>
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
      <section className={pageCss.panel}>
        <div className={pageCss.filters}>
          <Input.Search
            allowClear
            className={pageCss.search}
            enterButton={<SearchOutlined />}
            placeholder="按账号、用户名或昵称搜索"
            value={table.searchInput}
            onChange={(event) => table.setSearchInput(event.target.value)}
            onSearch={table.submitSearch}
          />
          <Select
            allowClear
            options={roles.map((role) => ({ label: role.name, value: role.id }))}
            placeholder="全部角色"
            style={{ width: 180 }}
            value={filterRole}
            onChange={setFilterRole}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              table.reload().catch(() => undefined);
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
        <div className={pageCss.table}>
          <Table<RbacUser>
            columns={columns}
            dataSource={table.list}
            loading={table.loading}
            rowKey="id"
            rowSelection={
              can(USER.DELETE)
                ? {
                    selectedRowKeys: visibleSelectedIds,
                    // 超管与当前登录用户服务端不允许删除，勾选了只会让整批失败
                    getCheckboxProps: (user) => ({
                      disabled: isBootstrapAdmin(user) || user.id === currentUser?.id,
                    }),
                    onChange: (keys) => setSelectedIds(keys.map(String)),
                  }
                : undefined
            }
            scroll={{ x: 1200 }}
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
      <ResetPasswordModal user={passwordUser} onClose={() => setPasswordUser(null)} />
    </div>
  );
}
