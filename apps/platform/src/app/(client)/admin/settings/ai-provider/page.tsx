'use client';

import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  RobotOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Button, Input, Popconfirm, Space, Switch, Table, Tag, type TableColumnsType } from 'antd';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  deleteAdminAiProviderOption,
  getAdminAiProviderOptions,
  updateAdminAiProviderOption,
  type AiProviderOption,
} from '@/api/modules/admin';
import styles from './page.module.scss';

function getProtocolLabel(protocol: IByok.AiProviderProtocol): string {
  const labelMap: Record<IByok.AiProviderProtocol, string> = {
    'chat-completions': 'Chat Completions',
    'generate-content': 'Generate Content',
    messages: 'Messages',
  };

  return labelMap[protocol];
}

function getFilteredProviderOptions(
  providerOptions: AiProviderOption[],
  searchTerm: string,
): AiProviderOption[] {
  const keyword = searchTerm.trim().toLowerCase();

  if (!keyword) {
    return providerOptions;
  }

  return providerOptions.filter((providerOption) => {
    return [
      providerOption.value,
      providerOption.label,
      providerOption.protocol,
      providerOption.chatBaseUrl,
      ...providerOption.models,
    ].some((value) => value.toLowerCase().includes(keyword));
  });
}

export default function AiProviderSettingsPage() {
  const [providerOptions, setProviderOptions] = useState<AiProviderOption[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingProvider, setUpdatingProvider] = useState<string | null>(null);

  const filteredProviderOptions = useMemo(
    () => getFilteredProviderOptions(providerOptions, searchTerm),
    [providerOptions, searchTerm],
  );

  const loadProviderOptions = useCallback(async () => {
    setLoading(true);
    try {
      const nextProviderOptions = await getAdminAiProviderOptions();

      setProviderOptions(nextProviderOptions);
    } catch {
      // 请求错误由 alova 全局提示处理。
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProviderOptions();
  }, [loadProviderOptions]);

  async function updateProviderEnabled(providerOption: AiProviderOption, enabled: boolean) {
    setUpdatingProvider(providerOption.value);
    try {
      const nextProviderOption = await updateAdminAiProviderOption(providerOption.value, {
        ...providerOption,
        enabled,
      });

      setProviderOptions((currentOptions) =>
        currentOptions.map((currentOption) =>
          currentOption.value === providerOption.value ? nextProviderOption : currentOption,
        ),
      );
    } catch {
      // 请求错误由 alova 全局提示处理。
    } finally {
      setUpdatingProvider(null);
    }
  }

  async function removeProviderOption(providerOption: AiProviderOption) {
    try {
      await deleteAdminAiProviderOption(providerOption.value);
      setProviderOptions((currentOptions) =>
        currentOptions.filter((currentOption) => currentOption.value !== providerOption.value),
      );
    } catch {
      // 请求错误由 alova 全局提示处理。
    }
  }

  const columns: TableColumnsType<AiProviderOption> = [
    {
      title: 'Provider',
      dataIndex: 'label',
      width: 220,
      render: (label: string, providerOption) => (
        <Space orientation="vertical" size={2}>
          <strong>{label}</strong>
          <span className={styles.code}>{providerOption.value}</span>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 120,
      render: (enabled: boolean, providerOption) => (
        <Switch
          checked={enabled}
          checkedChildren="启用"
          loading={updatingProvider === providerOption.value}
          unCheckedChildren="停用"
          onChange={async (checked) => {
            await updateProviderEnabled(providerOption, checked);
          }}
        />
      ),
    },
    {
      title: '协议',
      dataIndex: 'protocol',
      width: 180,
      render: (protocol: IByok.AiProviderProtocol) => (
        <span className={styles.muted}>{getProtocolLabel(protocol)}</span>
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
          {models.length > 4 && <Tag>+{models.length - 4}</Tag>}
        </Space>
      ),
    },
    {
      title: '调用地址',
      dataIndex: 'chatBaseUrl',
      ellipsis: true,
      render: (chatBaseUrl: string) => <span className={styles.muted}>{chatBaseUrl}</span>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 112,
      fixed: 'right',
      render: (_, providerOption) => (
        <div className={styles.actions}>
          <Link
            aria-label={`编辑 ${providerOption.label}`}
            href={`/admin/settings/ai-provider/${encodeURIComponent(providerOption.value)}/edit`}
          >
            <Button icon={<EditOutlined />} size="small" type="text" />
          </Link>
          <Popconfirm
            cancelText="取消"
            description="删除后用户新增密钥时将无法选择该 Provider。"
            okText="删除"
            title={`删除“${providerOption.label}”吗？`}
            onConfirm={async () => {
              await removeProviderOption(providerOption);
            }}
          >
            <Button
              aria-label={`删除 ${providerOption.label}`}
              danger
              icon={<DeleteOutlined />}
              size="small"
              type="text"
            />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <main className={styles.page}>
      <section className={styles.heading}>
        <h1>
          <RobotOutlined /> AI Provider
        </h1>
        <Link href="/admin/settings/ai-provider/create">
          <Button icon={<PlusOutlined />} type="primary">
            新增 Provider
          </Button>
        </Link>
      </section>
      <p>配置用户 AI 密钥页面可选择的 Provider。</p>
      <section className={styles.panel}>
        <div className={styles.filters}>
          <Input.Search
            allowClear
            className={styles.search}
            enterButton={<SearchOutlined />}
            placeholder="按标识、名称、协议、模型或调用地址搜索"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onSearch={(value) => setSearchTerm(value.trim())}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={async () => {
              await loadProviderOptions();
            }}
          >
            刷新
          </Button>
        </div>
        <Table
          className={styles.table}
          columns={columns}
          dataSource={filteredProviderOptions}
          loading={loading}
          pagination={false}
          rowKey="value"
          scroll={{ x: 1100 }}
        />
      </section>
    </main>
  );
}
