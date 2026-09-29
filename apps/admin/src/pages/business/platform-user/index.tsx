import { useCallback, useMemo, useState } from 'react';
import { Button, Input, Select, Table } from 'antd';
import { ReloadOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import { PERMISSION_CODE } from '@ai/constants/permissions';
import {
  getPlatformUsers,
  updatePlatformUserStatus,
  type PlatformUser,
  type PlatformUserStatus,
  type PlatformUserStatusPayload,
} from '@/api/methods/rbac';
import { SELECT_OPTION } from '@/constants/antd';
import {
  PLATFORM_USER_STATUS_FILTERS,
  getUserStatusMeta,
  type PlatformUserStatusAction,
} from '@/constants/user';
import { usePermission, useTable, useTableScrollHeight, type AdminTableQuery } from '@/hooks';
import Exception from '@/components/exception';
import css from '@/components/resource-page/index.module.scss';
import { getColumns } from './columns';
import StatusModal from './status-modal';

const STATUS_FILTER_OPTIONS = PLATFORM_USER_STATUS_FILTERS.map((status) => ({
  label: getUserStatusMeta(status)?.label ?? status,
  value: status,
}));

interface StatusTarget {
  user: PlatformUser;
  action: PlatformUserStatusAction;
}

export default function Page() {
  const can = usePermission();
  const canSetState = can(PERMISSION_CODE.OPERATION.PLATFORM_USER.WRITE_PERMISSION);
  const { scrollY, tableRef } = useTableScrollHeight();
  // 未选表示不按状态筛选
  const [filterStatus, setFilterStatus] = useState<PlatformUserStatus>();
  const [statusTarget, setStatusTarget] = useState<StatusTarget | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);

  const filters = useMemo(() => ({ status: filterStatus }), [filterStatus]);
  const fetcher = useCallback(
    async ({ page, pageSize, searchTerm }: AdminTableQuery) => {
      const response = await getPlatformUsers({
        page,
        pageSize,
        searchTerm,
        status: filterStatus,
      });
      return { list: response.data?.data ?? [], total: response.data?.total ?? 0 };
    },
    [filterStatus],
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
  } = useTable<PlatformUser>({ fetcher, filters });

  const onOpenStatusModal = (user: PlatformUser, action: PlatformUserStatusAction) => {
    setStatusTarget({ user, action });
  };

  const onRestore = (user: PlatformUser) =>
    runAction(() => updatePlatformUserStatus(user.id, { status: 'active' }));

  const onCloseStatusModal = () => {
    setStatusTarget(null);
  };

  const onSubmitStatus = async (payload: PlatformUserStatusPayload) => {
    if (!statusTarget) return;
    setStatusSaving(true);
    const updated = await runAction(() => updatePlatformUserStatus(statusTarget.user.id, payload));
    setStatusSaving(false);
    if (updated) setStatusTarget(null);
  };

  const columns = getColumns({ canSetState, onOpenStatusModal, onRestore });

  if (loadFailed) return <Exception onClick={reload} />;

  return (
    <main className={css.page}>
      <section className={css.heading}>
        <div>
          <h1>
            <UserOutlined /> 平台用户
          </h1>
          <p>查看通过前台注册的用户账号，并对账号进行限制、停用或封禁。</p>
        </div>
      </section>

      <section className={css.panel}>
        <div className={css.filters}>
          <Input.Search
            allowClear
            className={css.search}
            enterButton={<SearchOutlined />}
            placeholder="按昵称或邮箱搜索"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onSearch={submitSearch}
          />
          <Select<PlatformUserStatus>
            {...SELECT_OPTION}
            options={STATUS_FILTER_OPTIONS}
            placeholder="请选择状态"
            style={{ width: 140 }}
            value={filterStatus}
            onChange={setFilterStatus}
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
          <Table<PlatformUser>
            rowKey="id"
            columns={columns}
            dataSource={users}
            loading={loading}
            scroll={{ x: canSetState ? 1170 : 990, y: scrollY }}
            pagination={{
              current: page,
              pageSize,
              showSizeChanger: true,
              showTotal: (value) => `共 ${value} 位平台用户`,
              total,
              onChange: changePagination,
            }}
          />
        </div>
      </section>

      <StatusModal
        action={statusTarget?.action ?? null}
        saving={statusSaving}
        user={statusTarget?.user ?? null}
        onCancel={onCloseStatusModal}
        onSubmit={(payload) => {
          onSubmitStatus(payload).catch(() => undefined);
        }}
      />
    </main>
  );
}
