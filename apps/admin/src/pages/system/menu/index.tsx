import { useCallback, useMemo, useState, type Key } from 'react';
import { useNavigate } from 'react-router';
import { Button, Input, Select, Table } from 'antd';
import { MenuOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { PERMISSION_CODE } from '@ai/constants/permissions';
import {
  deleteRbacPermission,
  getRbacPermissions,
  updateRbacPermission,
  type PermissionKind,
  type RbacPermission,
} from '@/api/methods/rbac';
import { SELECT_OPTION } from '@/constants/antd';
import { PERMISSION_TYPE_OPTIONS } from '@/constants/permission';
import { usePermission, useTable, type AdminTableQuery } from '@/hooks';
import { MENU_CHANGED_EVENT } from '@/layout/menus';
import Exception from '@/components/exception';
import css from '@/components/resource-page/index.module.scss';
import { getColumns } from './columns';

const TYPE_FILTER_OPTIONS = PERMISSION_TYPE_OPTIONS.map(({ label, value }) => ({ label, value }));

/** 有下级的节点 id，默认全部展开 */
function collectExpandableKeys(permissions: RbacPermission[]): Key[] {
  return permissions.flatMap((permission) =>
    permission.children?.length
      ? [permission.id, ...collectExpandableKeys(permission.children)]
      : [],
  );
}

/** 菜单资源变了要通知外壳重建菜单，否则侧边栏还是旧的 */
function notifyMenuChanged() {
  window.dispatchEvent(new Event(MENU_CHANGED_EVENT));
}

export default function Page() {
  const navigate = useNavigate();
  const can = usePermission();
  const canManage = can(PERMISSION_CODE.OPERATION.PERMISSION.ASSIGN);
  // 未选表示不按类型筛选
  const [filterType, setFilterType] = useState<PermissionKind>();

  const filters = useMemo(() => ({ type: filterType }), [filterType]);
  // 资源以树形整体返回，不做分页
  const fetcher = useCallback(
    async ({ searchTerm }: AdminTableQuery) => {
      const response = await getRbacPermissions({ tree: true, searchTerm, type: filterType });
      return { list: response.data?.data ?? [], total: response.data?.total ?? 0 };
    },
    [filterType],
  );

  const {
    list: permissions,
    total,
    loading,
    loadFailed,
    searchInput,
    setSearchInput,
    submitSearch,
    reload,
    runAction,
  } = useTable<RbacPermission>({ fetcher, filters });

  // 数据是异步到的，defaultExpandAllRows 只在首次渲染生效；用户手动收起后以用户的选择为准
  const [expandedKeys, setExpandedKeys] = useState<Key[] | null>(null);
  const defaultExpandedKeys = useMemo(() => collectExpandableKeys(permissions), [permissions]);

  const onRemove = async (permission: RbacPermission) => {
    if (await runAction(() => deleteRbacPermission(permission.id))) notifyMenuChanged();
  };

  const onToggleState = async (permission: RbacPermission) => {
    const updated = await runAction(() =>
      updateRbacPermission(permission.id, { enable: !permission.enable }),
    );
    if (updated) notifyMenuChanged();
  };

  const onEdit = (permission: RbacPermission) => {
    void navigate(`/system/menu/edit/${permission.id}`);
  };

  const onCreateChild = (permission: RbacPermission) => {
    void navigate(`/system/menu/create?parentId=${permission.id}`);
  };

  const columns = getColumns({ canManage, onCreateChild, onEdit, onRemove, onToggleState });

  if (loadFailed) return <Exception onClick={reload} />;

  return (
    <main className={css.page}>
      <section className={css.heading}>
        <div>
          <h1>
            <MenuOutlined /> 菜单管理
          </h1>
          <p>按目录、菜单和按钮层级维护管理端的侧边栏菜单与接口访问控制。</p>
        </div>
        {canManage ? (
          <Button
            icon={<PlusOutlined />}
            type="primary"
            onClick={() => navigate('/system/menu/create')}
          >
            新建资源
          </Button>
        ) : null}
      </section>

      <section className={css.panel}>
        <div className={css.filters}>
          <Input.Search
            allowClear
            className={css.search}
            enterButton={<SearchOutlined />}
            placeholder="按名称、编码或说明搜索"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onSearch={submitSearch}
          />
          <Select
            {...SELECT_OPTION}
            options={TYPE_FILTER_OPTIONS}
            placeholder="请选择类型"
            style={{ width: 140 }}
            value={filterType}
            onChange={(value?: PermissionKind) => setFilterType(value)}
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
        <div className={css.table}>
          <Table<RbacPermission>
            rowKey="id"
            columns={columns}
            dataSource={permissions}
            expandable={{
              expandedRowKeys: expandedKeys ?? defaultExpandedKeys,
              onExpandedRowsChange: (keys) => setExpandedKeys([...keys]),
            }}
            loading={loading}
            pagination={false}
            scroll={{ x: 1240 }}
            footer={() => <span className={css.muted}>共 {total} 项资源</span>}
          />
        </div>
      </section>
    </main>
  );
}
