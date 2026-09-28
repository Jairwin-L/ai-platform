import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  Button,
  Input,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  type TableColumnsType,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  deleteAiProviderOption,
  getAiProviderOptions,
  updateAiProviderOption,
  type AiProviderOption,
} from '@/api/methods/settings';
import { PROVIDER_PROTOCOL_OPTIONS } from '@/constants/permission';
import { useLiteDebounced } from '@/hooks';
import pageCss from '@/styles/page.module.scss';

function getProtocolLabel(protocol: string): string {
  return PROVIDER_PROTOCOL_OPTIONS.find((item) => item.value === protocol)?.label ?? protocol;
}

function filterOptions(options: AiProviderOption[], searchTerm: string): AiProviderOption[] {
  const keyword = searchTerm.trim().toLowerCase();
  if (!keyword) return options;

  return options.filter((option) =>
    [option.value, option.label, option.protocol, option.chatBaseUrl, ...option.models].some(
      (value) => value.toLowerCase().includes(keyword),
    ),
  );
}

export default function AiProviderListPage() {
  const [options, setOptions] = useState<AiProviderOption[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const filteredOptions = useMemo(() => filterOptions(options, searchTerm), [options, searchTerm]);

  const loadOptions = useCallback(async () => {
    setLoading(true);
    try {
      setOptions(await getAiProviderOptions());
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOptions().catch(() => undefined);
  }, [loadOptions]);

  const onToggleEnabled = useCallback(async (option: AiProviderOption, enabled: boolean) => {
    setUpdating(option.value);
    try {
      const next = await updateAiProviderOption(option.value, { ...option, enabled });
      setOptions((current) => current.map((item) => (item.value === option.value ? next : item)));
    } catch {
      // 请求错误由全局响应拦截器提示
    } finally {
      setUpdating(null);
    }
  }, []);

  const onRemove = useCallback(async (option: AiProviderOption) => {
    try {
      await deleteAiProviderOption(option.value);
      setOptions((current) => current.filter((item) => item.value !== option.value));
    } catch {
      // 请求错误由全局响应拦截器提示
    }
  }, []);

  const onRefresh = useLiteDebounced(() => {
    void loadOptions();
  });

  const onSearch = (value: string) => {
    setSearchTerm(value.trim());
  };

  const columns = useMemo<TableColumnsType<AiProviderOption>>(
    () => [
      {
        title: 'Provider',
        dataIndex: 'label',
        width: 220,
        render: (label: string, option) => (
          <Space orientation="vertical" size={2}>
            <strong>{label}</strong>
            <code className={pageCss.code}>{option.value}</code>
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
            loading={updating === option.value}
            unCheckedChildren="停用"
            onChange={(checked) => onToggleEnabled(option, checked)}
          />
        ),
      },
      {
        title: '协议',
        dataIndex: 'protocol',
        width: 170,
        render: (protocol: string) => (
          <span className={pageCss.muted}>{getProtocolLabel(protocol)}</span>
        ),
      },
      {
        title: '模型',
        dataIndex: 'models',
        width: 260,
        render: (models: string[]) => (
          <Space size={[4, 4]} wrap>
            {models.slice(0, 4).map((model) => (
              <Tag key={model}>{model}</Tag>
            ))}
            {models.length > 4 ? <Tag>+{models.length - 4}</Tag> : null}
          </Space>
        ),
      },
      {
        title: '调用地址',
        dataIndex: 'chatBaseUrl',
        ellipsis: true,
        render: (value: string) => <span className={pageCss.muted}>{value}</span>,
      },
      {
        title: '操作',
        key: 'actions',
        width: 100,
        fixed: 'right',
        render: (_, option) => (
          <div className={pageCss.actions}>
            <Tooltip title="编辑">
              <Link to={`/system/ai-provider/edit/${encodeURIComponent(option.value)}`}>
                <Button icon={<EditOutlined />} size="small" type="text" />
              </Link>
            </Tooltip>
            <Popconfirm
              cancelText="取消"
              description="删除后用户新增密钥时将无法选择该 Provider。"
              okText="删除"
              title={`删除「${option.label}」吗？`}
              onConfirm={() => onRemove(option)}
            >
              <Button danger icon={<DeleteOutlined />} size="small" type="text" />
            </Popconfirm>
          </div>
        ),
      },
    ],
    [onRemove, onToggleEnabled, updating],
  );

  return (
    <div className={pageCss.page}>
      <section className={pageCss.heading}>
        <div>
          <h1>AI Provider</h1>
          <p>配置用户 AI 密钥页面可选择的 Provider。</p>
        </div>
        <Link to="/system/ai-provider/create">
          <Button icon={<PlusOutlined />} type="primary">
            新增 Provider
          </Button>
        </Link>
      </section>
      <section className={pageCss.panel}>
        <div className={pageCss.filters}>
          <Input.Search
            allowClear
            className={pageCss.search}
            enterButton={<SearchOutlined />}
            placeholder="按标识、名称、协议、模型或调用地址搜索"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onSearch={onSearch}
          />
          <Button icon={<ReloadOutlined />} onClick={onRefresh}>
            刷新
          </Button>
        </div>
        <div className={pageCss.table}>
          <Table
            columns={columns}
            dataSource={filteredOptions}
            loading={loading}
            pagination={false}
            rowKey="value"
            scroll={{ x: 1100 }}
          />
        </div>
      </section>
    </div>
  );
}
