import { Button, Popconfirm, Space, Switch, type TableColumnsType } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import type { ThirdPartyServiceOption } from '@/api/methods/settings';
import css from '@/components/resource-page/index.module.scss';

interface ColumnsOptions {
  /** 有 THIRD_PARTY_SERVICE_WRITE 才出现操作列与状态开关 */
  canWrite: boolean;
  /** 正在切换启停的服务标识 */
  updating: string | null;
  onEdit: (option: ThirdPartyServiceOption) => void;
  onRemove: (option: ThirdPartyServiceOption) => Promise<unknown>;
  onToggleEnabled: (option: ThirdPartyServiceOption, enabled: boolean) => Promise<unknown>;
}

/**
 * 第三方服务列表的列定义。
 *
 * 行内操作要用到页面的权限判定、路由跳转与列表刷新，所以这里导出工厂函数而不是模块级常量。
 */
export function getColumns({
  canWrite,
  updating,
  onEdit,
  onRemove,
  onToggleEnabled,
}: ColumnsOptions): TableColumnsType<ThirdPartyServiceOption> {
  const actionColumns: TableColumnsType<ThirdPartyServiceOption> = [
    {
      title: '操作',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, option) => (
        <div className={css.actions}>
          <Button icon={<EditOutlined />} size="small" type="link" onClick={() => onEdit(option)}>
            编辑
          </Button>
          <Popconfirm
            cancelText="取消"
            description="删除后用户新增凭据时将无法选择该服务。"
            okText="删除"
            title={`删除「${option.label}」吗？`}
            onConfirm={() => onRemove(option)}
          >
            <Button danger icon={<DeleteOutlined />} size="small" type="link">
              删除
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return [
    {
      title: '服务',
      dataIndex: 'label',
      width: 240,
      render: (label: string, option) => (
        <Space orientation="vertical" size={4}>
          <strong>{label}</strong>
          <code className={css.code}>{option.value}</code>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 110,
      render: (enabled: boolean, option) => (
        <Switch
          checked={enabled}
          checkedChildren="启用"
          disabled={!canWrite}
          loading={updating === option.value}
          unCheckedChildren="停用"
          onChange={(checked) => {
            onToggleEnabled(option, checked).catch(() => undefined);
          }}
        />
      ),
    },
    {
      title: 'API Key 链接',
      dataIndex: 'apiKeyUrl',
      ellipsis: true,
      render: (value?: string) => <span className={css.muted}>{value || '未配置'}</span>,
    },
    ...(canWrite ? actionColumns : []),
  ];
}
