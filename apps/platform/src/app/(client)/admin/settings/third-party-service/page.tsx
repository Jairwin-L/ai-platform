'use client';

import {
  ApiOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Button, Input, Popconfirm, Space, Switch, Table, Tag, type TableColumnsType } from 'antd';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  deleteAdminThirdPartyServiceOption,
  getAdminThirdPartyServiceOptions,
  updateAdminThirdPartyServiceOption,
  type ThirdPartyServiceOption,
} from '@/api/modules/admin';
import styles from './page.module.scss';

function getFilteredServiceOptions(
  serviceOptions: ThirdPartyServiceOption[],
  searchTerm: string,
): ThirdPartyServiceOption[] {
  const keyword = searchTerm.trim().toLowerCase();

  if (!keyword) {
    return serviceOptions;
  }

  return serviceOptions.filter((serviceOption) => {
    return [serviceOption.value, serviceOption.label, serviceOption.apiKeyUrl ?? ''].some((value) =>
      value.toLowerCase().includes(keyword),
    );
  });
}

export default function ThirdPartyServiceSettingsPage() {
  const [serviceOptions, setServiceOptions] = useState<ThirdPartyServiceOption[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingService, setUpdatingService] = useState<string | null>(null);

  const filteredServiceOptions = useMemo(
    () => getFilteredServiceOptions(serviceOptions, searchTerm),
    [serviceOptions, searchTerm],
  );

  const loadServiceOptions = useCallback(async () => {
    setLoading(true);
    try {
      const nextServiceOptions = await getAdminThirdPartyServiceOptions();

      setServiceOptions(nextServiceOptions);
    } catch {
      // 请求错误由 alova 全局提示处理。
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServiceOptions();
  }, [loadServiceOptions]);

  async function updateServiceEnabled(
    serviceOption: ThirdPartyServiceOption,
    enabled: boolean,
  ): Promise<void> {
    setUpdatingService(serviceOption.value);
    try {
      const nextServiceOption = await updateAdminThirdPartyServiceOption(serviceOption.value, {
        ...serviceOption,
        enabled,
      });

      setServiceOptions((currentOptions) =>
        currentOptions.map((currentOption) =>
          currentOption.value === serviceOption.value ? nextServiceOption : currentOption,
        ),
      );
    } catch {
      // 请求错误由 alova 全局提示处理。
    } finally {
      setUpdatingService(null);
    }
  }

  async function removeServiceOption(serviceOption: ThirdPartyServiceOption): Promise<void> {
    try {
      await deleteAdminThirdPartyServiceOption(serviceOption.value);
      setServiceOptions((currentOptions) =>
        currentOptions.filter((currentOption) => currentOption.value !== serviceOption.value),
      );
    } catch {
      // 请求错误由 alova 全局提示处理。
    }
  }

  const columns: TableColumnsType<ThirdPartyServiceOption> = [
    {
      title: '服务',
      dataIndex: 'label',
      width: 240,
      render: (label: string, serviceOption) => (
        <Space orientation="vertical" size={2}>
          <strong>{label}</strong>
          <span className={styles.code}>{serviceOption.value}</span>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 120,
      render: (enabled: boolean, serviceOption) => (
        <Switch
          checked={enabled}
          checkedChildren="启用"
          loading={updatingService === serviceOption.value}
          unCheckedChildren="停用"
          onChange={async (checked) => {
            await updateServiceEnabled(serviceOption, checked);
          }}
        />
      ),
    },
    {
      title: '标签颜色',
      dataIndex: 'color',
      width: 140,
      render: (color: string) => <Tag color={color}>{color}</Tag>,
    },
    {
      title: 'API Key 链接',
      dataIndex: 'apiKeyUrl',
      ellipsis: true,
      render: (apiKeyUrl?: string) => <span className={styles.muted}>{apiKeyUrl || '未配置'}</span>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 112,
      fixed: 'right',
      render: (_, serviceOption) => (
        <div className={styles.actions}>
          <Link
            aria-label={`编辑 ${serviceOption.label}`}
            href={`/admin/settings/third-party-service/${encodeURIComponent(
              serviceOption.value,
            )}/edit`}
          >
            <Button icon={<EditOutlined />} size="small" type="text" />
          </Link>
          <Popconfirm
            cancelText="取消"
            description="删除后用户新增凭据时将无法选择该服务。"
            okText="删除"
            title={`删除“${serviceOption.label}”吗？`}
            onConfirm={async () => {
              await removeServiceOption(serviceOption);
            }}
          >
            <Button
              aria-label={`删除 ${serviceOption.label}`}
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
        <div>
          <h1>
            <ApiOutlined /> 第三方服务
          </h1>
          <p>配置用户第三方服务 API 凭据页面可选择的服务。</p>
        </div>
        <Link href="/admin/settings/third-party-service/create">
          <Button icon={<PlusOutlined />} type="primary">
            新增服务
          </Button>
        </Link>
      </section>
      <section className={styles.panel}>
        <div className={styles.filters}>
          <Input.Search
            allowClear
            className={styles.search}
            enterButton={<SearchOutlined />}
            placeholder="按标识、名称或 API Key 链接搜索"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onSearch={(value) => setSearchTerm(value.trim())}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={async () => {
              await loadServiceOptions();
            }}
          >
            刷新
          </Button>
        </div>
        <Table
          className={styles.table}
          columns={columns}
          dataSource={filteredServiceOptions}
          loading={loading}
          pagination={false}
          rowKey="value"
          scroll={{ x: 900 }}
        />
      </section>
    </main>
  );
}
