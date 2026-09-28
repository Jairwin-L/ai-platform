import { useCallback, useMemo, useState } from 'react';
import { Button, Input, Select, Table } from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { PERMISSION_CODE } from '@ai/constants/permissions';
import {
  getPlatformUsers,
  updatePlatformUserStatus,
  type PlatformUser,
  type PlatformUserStatus,
  type PlatformUserStatusPayload,
} from '@/api/methods/rbac';
import {
  PLATFORM_USER_STATUS_FILTERS,
  getUserStatusMeta,
  type PlatformUserStatusAction,
} from '@/constants/user';
import { usePermission, useTable, type AdminTableQuery } from '@/hooks';
import pageCss from '@/styles/page.module.scss';
import { getPlatformUserColumns } from './columns';
import StatusModal from './status-modal';

const STATUS_FILTER_OPTIONS = PLATFORM_USER_STATUS_FILTERS.map((status) => ({
  label: getUserStatusMeta(status)?.label ?? status,
  value: status,
}));

export default function PlatformUserListPage() {
  const can = usePermission();
  const canSetState = can(PERMISSION_CODE.OPERATION.PLATFORM_USER.WRITE_PERMISSION);
  // 未选表示不按状态筛选
  const [filterStatus, setFilterStatus] = useState<PlatformUserStatus>();
  const [statusTarget, setStatusTarget] = useState<{
    user: PlatformUser;
    action: PlatformUserStatusAction;
  } | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const filters = useMemo(() => ({ status: filterStatus }), [filterStatus]);

  const fetcher = useCallback(
    async ({ page, pageSize, searchTerm }: AdminTableQuery) => {
      const result = await getPlatformUsers({ page, pageSize, searchTerm, status: filterStatus });
      return { list: result.data, total: result.total };
    },
    [filterStatus],
  );
  const table = useTable<PlatformUser>({ fetcher, filters });
  const { runAction } = table;

  const columns = useMemo(
    () =>
      getPlatformUserColumns({
        canSetState,
        onOpenStatusModal: (user, action) => setStatusTarget({ user, action }),
        onRestore: (user) =>
          runAction(() => updatePlatformUserStatus(user.id, { status: 'active' })),
      }),
    [canSetState, runAction],
  );

  const onSubmitStatus = async (payload: PlatformUserStatusPayload) => {
    if (!statusTarget) return;
    setStatusSaving(true);
    const updated = await runAction(() => updatePlatformUserStatus(statusTarget.user.id, payload));
    setStatusSaving(false);
    if (updated) setStatusTarget(null);
  };

  return (
    <div className={pageCss.page}>
      <section className={pageCss.heading}>
        <div>
          <h1>平台用户</h1>
          <p>查看通过前台注册的用户账号，并对账号进行限制、停用或封禁。</p>
        </div>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            table.reload().catch(() => undefined);
          }}
        >
          刷新
        </Button>
      </section>
      <section className={pageCss.panel}>
        <div className={pageCss.filters}>
          <Input.Search
            allowClear
            className={pageCss.search}
            enterButton={<SearchOutlined />}
            placeholder="按昵称或邮箱搜索"
            value={table.searchInput}
            onChange={(event) => table.setSearchInput(event.target.value)}
            onSearch={table.submitSearch}
          />
          <Select<PlatformUserStatus>
            allowClear
            options={STATUS_FILTER_OPTIONS}
            placeholder="全部状态"
            style={{ width: 140 }}
            value={filterStatus}
            onChange={setFilterStatus}
          />
        </div>
        <div className={pageCss.table}>
          <Table<PlatformUser>
            columns={columns}
            dataSource={table.list}
            loading={table.loading}
            rowKey="id"
            scroll={{ x: canSetState ? 1130 : 950 }}
            pagination={{
              current: table.page,
              pageSize: table.pageSize,
              total: table.total,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 位平台用户`,
              onChange: table.changePagination,
            }}
          />
        </div>
      </section>
      <StatusModal
        action={statusTarget?.action ?? null}
        saving={statusSaving}
        user={statusTarget?.user ?? null}
        onCancel={() => setStatusTarget(null)}
        onSubmit={(payload) => {
          onSubmitStatus(payload).catch(() => undefined);
        }}
      />
    </div>
  );
}
