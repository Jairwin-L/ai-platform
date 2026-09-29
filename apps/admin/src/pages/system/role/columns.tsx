import { Button, Popconfirm, Space, Switch, Tag, type TableColumnsType } from 'antd';
import { DeleteOutlined, EditOutlined, UserAddOutlined } from '@ant-design/icons';
import { PERMISSION_CODE } from '@ai/constants/permissions';
import { RoleCode } from '@ai/constants/roles';
import type { RbacRole } from '@/api/methods/rbac';
import { EMPTY_PLACEHOLDER } from '@/constants/biz';
import css from '@/components/resource-page/index.module.scss';
import { formatDateTime } from '@/utils/date';

const { ROLE } = PERMISSION_CODE.OPERATION;

interface ColumnsOptions {
  /** 按钮级权限判定，来自 usePermission */
  can: (...codes: string[]) => boolean;
  onEdit: (role: RbacRole) => void;
  onOpenAssignUser: (role: RbacRole) => void;
  onRemove: (role: RbacRole) => Promise<boolean>;
  onToggleState: (role: RbacRole) => Promise<boolean>;
}

/**
 * 角色列表的列定义。
 *
 * 行内操作要用到页面的权限判定、路由跳转与列表刷新，所以这里导出工厂函数而不是模块级常量。
 */
export function getColumns({
  can,
  onEdit,
  onOpenAssignUser,
  onRemove,
  onToggleState,
}: ColumnsOptions): TableColumnsType<RbacRole> {
  return [
    {
      title: '角色',
      dataIndex: 'name',
      width: 220,
      render: (name: string, role) => (
        <Space orientation="vertical" size={2}>
          <strong>{name}</strong>
          <Space size={4} wrap>
            <code className={css.code}>{role.code}</code>
            {role.isSystem ? <Tag color="blue">系统角色</Tag> : null}
          </Space>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'enable',
      width: 100,
      render: (_, role) => (
        <Switch
          checked={role.enable}
          checkedChildren="启用"
          disabled={role.code === RoleCode.SUPER_ADMIN || !can(ROLE.SET_STATE)}
          unCheckedChildren="停用"
          onChange={() => {
            onToggleState(role).catch(() => undefined);
          }}
        />
      ),
    },
    {
      title: '说明',
      dataIndex: 'description',
      ellipsis: true,
      render: (value: string | null, role) => (
        <span className={css.muted}>{value || role.remark || EMPTY_PLACEHOLDER}</span>
      ),
    },
    { title: '关联用户', dataIndex: 'userCount', width: 100, align: 'center' },
    {
      title: '权限数',
      key: 'permissionCount',
      width: 90,
      align: 'center',
      render: (_, role) => role.permissions.length,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 180,
      render: (value: string) => <span className={css.muted}>{formatDateTime(value)}</span>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 210,
      fixed: 'right',
      render: (_, role) => {
        // 超级管理员角色服务端不允许分配用户或删除
        const builtin = role.code === RoleCode.SUPER_ADMIN;
        return (
          <div className={css.actions}>
            {can(ROLE.ASSIGN_USER) ? (
              <Button
                disabled={builtin}
                icon={<UserAddOutlined />}
                size="small"
                type="link"
                onClick={() => onOpenAssignUser(role)}
              >
                分配
              </Button>
            ) : null}
            {can(ROLE.EDIT) ? (
              <Button icon={<EditOutlined />} size="small" type="link" onClick={() => onEdit(role)}>
                编辑
              </Button>
            ) : null}
            {can(ROLE.DELETE) ? (
              <Popconfirm
                cancelText="取消"
                description="删除后无法恢复，且会移除该角色的授权与用户关联。"
                disabled={builtin}
                okText="删除"
                title={`删除「${role.name}」吗？`}
                onConfirm={() => onRemove(role)}
              >
                <Button
                  danger
                  disabled={builtin}
                  icon={<DeleteOutlined />}
                  size="small"
                  type="link"
                >
                  删除
                </Button>
              </Popconfirm>
            ) : null}
          </div>
        );
      },
    },
  ];
}
