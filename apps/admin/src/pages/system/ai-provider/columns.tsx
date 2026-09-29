import { Button, Popconfirm, Space, Switch, Tag, type TableColumnsType } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import type { AiProviderOption } from '@/api/methods/settings';
import css from '@/components/resource-page/index.module.scss';
import { getProtocolLabel } from './const';

/** 模型标签只展示前几个，其余折叠成 +N */
const VISIBLE_MODEL_COUNT = 4;

interface ColumnsOptions {
  /** 有 AI_PROVIDER_WRITE 才出现操作列与状态开关 */
  canWrite: boolean;
  /** 正在切换启停的 Provider 标识 */
  updating: string | null;
  onEdit: (option: AiProviderOption) => void;
  onRemove: (option: AiProviderOption) => Promise<unknown>;
  onToggleEnabled: (option: AiProviderOption, enabled: boolean) => Promise<unknown>;
}

/**
 * AI Provider 列表的列定义。
 *
 * 行内操作要用到页面的权限判定、路由跳转与列表刷新，所以这里导出工厂函数而不是模块级常量。
 */
export function getColumns({
  canWrite,
  updating,
  onEdit,
  onRemove,
  onToggleEnabled,
}: ColumnsOptions): TableColumnsType<AiProviderOption> {
  const actionColumns: TableColumnsType<AiProviderOption> = [
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
            description="删除后用户新增密钥时将无法选择该 Provider。"
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
      title: 'Provider',
      dataIndex: 'label',
      width: 220,
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
      title: '协议',
      dataIndex: 'protocol',
      width: 170,
      render: (protocol: string) => <span className={css.muted}>{getProtocolLabel(protocol)}</span>,
    },
    {
      title: '模型',
      dataIndex: 'models',
      width: 280,
      render: (models: string[]) => (
        <Space size={[4, 4]} wrap>
          {models.slice(0, VISIBLE_MODEL_COUNT).map((model) => (
            <Tag key={model}>{model}</Tag>
          ))}
          {models.length > VISIBLE_MODEL_COUNT ? (
            <Tag>+{models.length - VISIBLE_MODEL_COUNT}</Tag>
          ) : null}
        </Space>
      ),
    },
    {
      title: '调用地址',
      dataIndex: 'chatBaseUrl',
      ellipsis: true,
      render: (value: string) => <span className={css.muted}>{value}</span>,
    },
    ...(canWrite ? actionColumns : []),
  ];
}
