import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  Button,
  Input,
  Popconfirm,
  Space,
  Switch,
  Table,
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
  deleteThirdPartyServiceOption,
  getThirdPartyServiceOptions,
  updateThirdPartyServiceOption,
  type ThirdPartyServiceOption,
} from '@/api/methods/settings';
import { PERMISSION_CODE } from '@ai/constants/permissions';
import { useLiteDebounced, usePermission } from '@/hooks';
import pageCss from '@/styles/page.module.scss';

function filterOptions(
  options: ThirdPartyServiceOption[],
  searchTerm: string,
): ThirdPartyServiceOption[] {
  const keyword = searchTerm.trim().toLowerCase();
  if (!keyword) return options;

  return options.filter((option) =>
    [option.value, option.label, option.apiKeyUrl ?? ''].some((value) =>
      value.toLowerCase().includes(keyword),
    ),
  );
}

export default function ThirdPartyServiceListPage() {
  const [options, setOptions] = useState<ThirdPartyServiceOption[]>([]);
  const can = usePermission();
  // 只读账号能看列表，但新增、编辑、启停、删除都要 THIRD_PARTY_SERVICE_WRITE
  const canWrite = can(PERMISSION_CODE.OPERATION.THIRD_PARTY_SERVICE.WRITE);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const filteredOptions = useMemo(() => filterOptions(options, searchTerm), [options, searchTerm]);

  const loadOptions = useCallback(async () => {
    setLoading(true);
    try {
      setOptions(await getThirdPartyServiceOptions());
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOptions().catch(() => undefined);
  }, [loadOptions]);

  const onToggleEnabled = useCallback(async (option: ThirdPartyServiceOption, enabled: boolean) => {
    setUpdating(option.value);
    try {
      const next = await updateThirdPartyServiceOption(option.value, { ...option, enabled });
      setOptions((current) => current.map((item) => (item.value === option.value ? next : item)));
    } catch {
      // 请求错误由全局响应拦截器提示
    } finally {
      setUpdating(null);
    }
  }, []);

  const onRemove = useCallback(async (option: ThirdPartyServiceOption) => {
    try {
      await deleteThirdPartyServiceOption(option.value);
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

  const columns = useMemo<TableColumnsType<ThirdPartyServiceOption>>(
    () => [
      {
        title: '服务',
        dataIndex: 'label',
        width: 240,
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
            disabled={!canWrite}
            checkedChildren="启用"
            loading={updating === option.value}
            unCheckedChildren="停用"
            onChange={(checked) => onToggleEnabled(option, checked)}
          />
        ),
      },
      {
        title: 'API Key 链接',
        dataIndex: 'apiKeyUrl',
        ellipsis: true,
        render: (value?: string) => <span className={pageCss.muted}>{value || '未配置'}</span>,
      },
      {
        title: '操作',
        key: 'actions',
        width: 100,
        fixed: 'right',
        render: (_, option) => (
          <div className={pageCss.actions}>
            <Tooltip title="编辑">
              <Link to={`/system/third-party-service/edit/${encodeURIComponent(option.value)}`}>
                <Button icon={<EditOutlined />} size="small" type="text" />
              </Link>
            </Tooltip>
            <Popconfirm
              cancelText="取消"
              description="删除后用户新增凭据时将无法选择该服务。"
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
    [canWrite, onRemove, onToggleEnabled, updating],
  );

  return (
    <div className={pageCss.page}>
      <section className={pageCss.heading}>
        <div>
          <h1>第三方服务</h1>
          <p>配置用户第三方服务 API 凭据页面可选择的服务。</p>
        </div>
        {canWrite ? (
          <Link to="/system/third-party-service/create">
            <Button icon={<PlusOutlined />} type="primary">
              新增服务
            </Button>
          </Link>
        ) : null}
      </section>
      <section className={pageCss.panel}>
        <div className={pageCss.filters}>
          <Input.Search
            allowClear
            className={pageCss.search}
            enterButton={<SearchOutlined />}
            placeholder="按标识、名称或 API Key 链接搜索"
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
            columns={canWrite ? columns : columns.filter((column) => column.key !== 'actions')}
            dataSource={filteredOptions}
            loading={loading}
            pagination={false}
            rowKey="value"
            scroll={{ x: 900 }}
          />
        </div>
      </section>
    </div>
  );
}
