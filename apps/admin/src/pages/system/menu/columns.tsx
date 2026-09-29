import { Badge, Button, Popconfirm, Space, Switch, Tag, type TableColumnsType } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { RbacPermission } from '@/api/methods/rbac';
import { EMPTY_PLACEHOLDER } from '@/constants/biz';
import { LEAF_PERMISSION_TYPES, getPermissionTypeMeta } from '@/constants/permission';
import css from '@/components/resource-page/index.module.scss';
import { formatDateTime } from '@/utils/date';

interface ColumnsOptions {
  /** 有 PERMISSION_ASSIGN 才出现操作列与状态开关 */
  canManage: boolean;
  onCreateChild: (permission: RbacPermission) => void;
  onEdit: (permission: RbacPermission) => void;
  onRemove: (permission: RbacPermission) => Promise<void>;
  onToggleState: (permission: RbacPermission) => Promise<void>;
}

/**
 * 菜单资源列表的列定义。
 *
 * 行内操作要用到页面的路由跳转与列表刷新，所以这里导出工厂函数而不是模块级常量。
 */
export function getColumns({
  canManage,
  onCreateChild,
  onEdit,
  onRemove,
  onToggleState,
}: ColumnsOptions): TableColumnsType<RbacPermission> {
  const actionColumns: TableColumnsType<RbacPermission> = [
    {
      title: '操作',
      key: 'actions',
      width: 230,
      fixed: 'right',
      render: (_, permission) => {
        const hasChildren = Boolean(permission.children?.length);
        return (
          <div className={css.actions}>
            {LEAF_PERMISSION_TYPES.includes(permission.type) ? null : (
              <Button
                icon={<PlusOutlined />}
                size="small"
                type="link"
                onClick={() => onCreateChild(permission)}
              >
                新增下级
              </Button>
            )}
            <Button
              icon={<EditOutlined />}
              size="small"
              type="link"
              onClick={() => onEdit(permission)}
            >
              编辑
            </Button>
            <Popconfirm
              cancelText="取消"
              description="删除后无法恢复，并会移除该资源在各角色中的授权。"
              disabled={hasChildren}
              okText="删除"
              title={`删除「${permission.name}」吗？`}
              onConfirm={() => onRemove(permission)}
            >
              <Button
                danger
                disabled={hasChildren}
                icon={<DeleteOutlined />}
                size="small"
                title={hasChildren ? '请先删除下级资源' : undefined}
                type="link"
              >
                删除
              </Button>
            </Popconfirm>
          </div>
        );
      },
    },
  ];

  return [
    {
      title: '资源名称',
      dataIndex: 'name',
      width: 280,
      render: (name: string, permission) => (
        <Space orientation="vertical" size={2}>
          <strong>{name}</strong>
          <code className={css.code}>{permission.code}</code>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 90,
      render: (type: string) => {
        const meta = getPermissionTypeMeta(type);
        return <Tag color={meta?.color}>{meta?.label ?? type}</Tag>;
      },
    },
    {
      title: '路由',
      dataIndex: 'path',
      width: 220,
      render: (path: string | null) => (
        <span className={css.muted}>{path || EMPTY_PLACEHOLDER}</span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'enable',
      width: 100,
      render: (_, permission) => (
        <Switch
          checked={permission.enable}
          checkedChildren="启用"
          disabled={!canManage}
          unCheckedChildren="停用"
          onChange={() => {
            onToggleState(permission).catch(() => undefined);
          }}
        />
      ),
    },
    {
      title: '显示',
      dataIndex: 'isShow',
      width: 90,
      render: (isShow: boolean) => (
        <Badge status={isShow ? 'success' : 'default'} text={isShow ? '显示' : '隐藏'} />
      ),
    },
    { title: '排序', dataIndex: 'sort', width: 70 },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 180,
      render: (value: string) => <span className={css.muted}>{formatDateTime(value)}</span>,
    },
    ...(canManage ? actionColumns : []),
  ];
}
