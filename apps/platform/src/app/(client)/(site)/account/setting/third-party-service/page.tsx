'use client';

import {
  ApiOutlined,
  DeleteOutlined,
  EditOutlined,
  LinkOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Table,
  Tag,
  Tooltip,
  type TableColumnsType,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import {
  createThirdPartyServiceCredential,
  deleteThirdPartyServiceCredential,
  getThirdPartyServiceCredentials,
  getThirdPartyServiceOptions,
  overwriteThirdPartyServiceCredential,
  type CredentialStatus,
  type CredentialTtlOption,
  type OverwriteThirdPartyServiceCredentialPayload,
  type SaveThirdPartyServiceCredentialPayload,
  type ThirdPartyServiceCredential,
  type ThirdPartyServiceOption,
} from '@/api/modules/third-party-service-credentials';
import styles from './page.module.scss';
import { MODAL_OPTION } from '@/constants/antd';

const initialValues: IAppForms.ThirdPartyServiceCredentialFormValues = {
  apiKey: '',
  label: '',
  serviceName: '',
  ttlOption: '7d',
};

const ttlOptions: Array<{ label: string; value: CredentialTtlOption }> = [
  { label: '7 天', value: '7d' },
  { label: '2 周', value: '2w' },
  { label: '3 周', value: '3w' },
  { label: '4 周', value: '4w' },
];

const statusOptions: Array<{ color: string; label: string; value: CredentialStatus }> = [
  { color: 'success', label: '可用', value: 'active' },
  { color: 'warning', label: '已禁用', value: 'disabled' },
  { color: 'error', label: '已过期', value: 'expired' },
  { color: 'error', label: '无效', value: 'invalid' },
];

function getStatusOption(status: CredentialStatus) {
  return statusOptions.find((item) => item.value === status);
}

function getServiceOption(serviceOptions: ThirdPartyServiceOption[], serviceName: string) {
  return serviceOptions.find((item) => item.value === serviceName);
}

function formatDate(value?: string): string {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatRemainingTime(seconds: number): string {
  if (seconds <= 0) {
    return '已过期';
  }

  const days = Math.floor(seconds / 86400);

  if (days >= 1) {
    return `${days} 天`;
  }

  const hours = Math.floor(seconds / 3600);

  if (hours >= 1) {
    return `${hours} 小时`;
  }

  const minutes = Math.max(1, Math.floor(seconds / 60));

  return `${minutes} 分钟`;
}

function hasBlankCharacter(value: string): boolean {
  return /\s/u.test(value);
}

export default function ThirdPartyServiceCredentialsPage() {
  const [form] = Form.useForm<IAppForms.ThirdPartyServiceCredentialFormValues>();
  const selectedService = Form.useWatch('serviceName', form);
  const [credentials, setCredentials] = useState<ThirdPartyServiceCredential[]>([]);
  const [serviceOptions, setServiceOptions] = useState<ThirdPartyServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [overwriteCredential, setOverwriteCredential] =
    useState<ThirdPartyServiceCredential | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [credentialsResult, serviceOptionsResult] = await Promise.allSettled([
      getThirdPartyServiceCredentials(),
      getThirdPartyServiceOptions(),
    ]);

    if (credentialsResult.status === 'fulfilled') {
      setCredentials(credentialsResult.value);
    } else {
      setCredentials([]);
    }

    if (serviceOptionsResult.status === 'fulfilled') {
      setServiceOptions(serviceOptionsResult.value);
    } else {
      setServiceOptions([]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData().catch(() => undefined);
  }, [loadData]);

  const usedServiceNames = new Set(credentials.map((credential) => credential.serviceName));
  const availableServiceOptions = serviceOptions.filter(
    (option) => !usedServiceNames.has(option.value),
  );

  function onCreateClick(): void {
    setOverwriteCredential(null);
    form.setFieldsValue({
      ...initialValues,
      serviceName: availableServiceOptions[0]?.value ?? initialValues.serviceName,
    });
    setModalOpen(true);
  }

  function onModalCancel(): void {
    if (saving) {
      return;
    }

    setModalOpen(false);
    setOverwriteCredential(null);
    form.resetFields();
  }

  function onOverwriteClick(credential: ThirdPartyServiceCredential): void {
    setOverwriteCredential(credential);
    form.setFieldsValue({
      apiKey: '',
      label: credential.label,
      serviceName: credential.serviceName,
      ttlOption: initialValues.ttlOption,
    });
    setModalOpen(true);
  }

  async function onFinish(values: IAppForms.ThirdPartyServiceCredentialFormValues): Promise<void> {
    setSaving(true);

    try {
      if (overwriteCredential) {
        const payload: OverwriteThirdPartyServiceCredentialPayload = {
          credentialId: overwriteCredential.credentialId,
          apiKey: values.apiKey.trim(),
          label: values.label.trim(),
          ttlOption: values.ttlOption,
        };

        await overwriteThirdPartyServiceCredential(payload);
      } else {
        const payload: SaveThirdPartyServiceCredentialPayload = {
          ...values,
          apiKey: values.apiKey.trim(),
          label: values.label.trim(),
          serviceName: values.serviceName.trim(),
        };

        await createThirdPartyServiceCredential(payload);
      }

      setModalOpen(false);
      setOverwriteCredential(null);
      form.resetFields();
      await loadData();
    } catch {
      // 请求错误由 alova 全局提示处理。
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteConfirm(credential: ThirdPartyServiceCredential): Promise<void> {
    setDeletingId(credential.credentialId);

    try {
      await deleteThirdPartyServiceCredential(credential.credentialId);
      await loadData();
    } catch {
      // 请求错误由 alova 全局提示处理。
    } finally {
      setDeletingId(null);
    }
  }

  const selectedServiceOption = getServiceOption(
    serviceOptions,
    selectedService ?? availableServiceOptions[0]?.value ?? initialValues.serviceName,
  );
  const isOverwriteMode = Boolean(overwriteCredential);
  const overwriteServiceOption = overwriteCredential
    ? getServiceOption(serviceOptions, overwriteCredential.serviceName)
    : undefined;

  const columns: TableColumnsType<ThirdPartyServiceCredential> = [
    {
      title: '凭据',
      key: 'label',
      width: 260,
      fixed: 'left',
      render: (_, credential) => (
        <div className={styles['credential-title']}>
          <strong>{credential.label}</strong>
          <span className={styles.code}>{credential.keyHint}</span>
        </div>
      ),
    },
    {
      title: '第三方服务',
      dataIndex: 'serviceName',
      width: 180,
      render: (serviceName: string) => {
        const option = getServiceOption(serviceOptions, serviceName);

        return <Tag color={option?.color ?? 'default'}>{option?.label ?? serviceName}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 112,
      render: (status: CredentialStatus) => {
        const option = getStatusOption(status);

        return <Tag color={option?.color ?? 'default'}>{option?.label ?? status}</Tag>;
      },
    },
    {
      title: '剩余有效期',
      dataIndex: 'remainingSeconds',
      width: 136,
      render: (seconds: number) => (
        <span className={styles.muted}>{formatRemainingTime(seconds)}</span>
      ),
    },
    {
      title: '过期时间',
      dataIndex: 'expiresAt',
      width: 180,
      render: (value: string) => <span className={styles.muted}>{formatDate(value)}</span>,
    },
    {
      title: '最近使用',
      dataIndex: 'lastUsedAt',
      width: 180,
      render: (value?: string) => <span className={styles.muted}>{formatDate(value)}</span>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 112,
      fixed: 'right',
      render: (_, credential) => (
        <div className={styles.actions}>
          <Tooltip title="覆盖凭据">
            <Button
              aria-label={`覆盖 ${credential.label}`}
              icon={<EditOutlined />}
              size="small"
              type="text"
              onClick={() => onOverwriteClick(credential)}
            />
          </Tooltip>
          <Popconfirm
            cancelText="取消"
            description="删除后需要重新保存凭据才能继续使用。"
            okText="删除"
            okType="danger"
            title={`删除“${credential.label}”吗？`}
            onConfirm={async () => {
              await onDeleteConfirm(credential);
            }}
          >
            <Button
              aria-label={`删除 ${credential.label}`}
              danger
              icon={<DeleteOutlined />}
              loading={deletingId === credential.credentialId}
              size="small"
              type="text"
            />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <>
      <main className={styles.page}>
        <section className={styles.heading}>
          <div>
            <h1>
              <ApiOutlined /> 第三方服务 API 凭据
            </h1>
            <p>保存和维护当前账号可用的第三方服务 API Key，列表仅展示脱敏信息。</p>
          </div>
          <Button
            disabled={!availableServiceOptions.length}
            icon={<PlusOutlined />}
            type="primary"
            onClick={onCreateClick}
          >
            新增凭据
          </Button>
        </section>
        <section className={styles.panel}>
          <div className={styles.filters}>
            <span className={styles.summary}>共 {credentials.length} 个凭据</span>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                loadData().catch(() => undefined);
              }}
            >
              刷新列表
            </Button>
          </div>
          <div className={styles.table}>
            <Table
              columns={columns}
              dataSource={credentials}
              loading={loading}
              pagination={false}
              rowKey="credentialId"
              scroll={{ x: 1100 }}
            />
          </div>
        </section>
      </main>
      <Modal
        {...MODAL_OPTION}
        cancelText="取消"
        confirmLoading={saving}
        okText={isOverwriteMode ? '覆盖凭据' : '保存凭据'}
        open={modalOpen}
        title={isOverwriteMode ? '覆盖第三方服务 API 凭据' : '新增第三方服务 API 凭据'}
        onCancel={onModalCancel}
        onOk={() => form.submit()}
      >
        <p className={styles['modal-help']}>
          {isOverwriteMode
            ? '仅覆盖凭据名称、API Key 和有效期，第三方服务保持不变。覆盖后列表仍只展示脱敏尾号。'
            : 'API Key 保存后只展示脱敏尾号。请确认凭据可用于对应第三方服务，过期后需要重新添加。'}
        </p>
        <Form
          form={form}
          initialValues={{
            ...initialValues,
            serviceName: availableServiceOptions[0]?.value ?? initialValues.serviceName,
          }}
          layout="vertical"
          preserve={false}
          onFinish={onFinish}
        >
          <Form.Item
            label="凭据名称"
            name="label"
            rules={[{ required: true, whitespace: true, message: '请输入凭据名称' }]}
          >
            <Input maxLength={80} placeholder="例如：图片压缩服务密钥" />
          </Form.Item>
          {isOverwriteMode ? (
            <Form.Item label="第三方服务">
              <div className={styles['readonly-value']}>
                <Tag color={overwriteServiceOption?.color ?? 'default'}>
                  {overwriteServiceOption?.label ?? overwriteCredential?.serviceName}
                </Tag>
              </div>
            </Form.Item>
          ) : (
            <Form.Item
              label="第三方服务"
              name="serviceName"
              rules={[{ required: true, message: '请选择第三方服务' }]}
            >
              <Select
                options={serviceOptions.map((option) => ({
                  disabled: usedServiceNames.has(option.value),
                  label: option.label,
                  value: option.value,
                }))}
                placeholder="请选择第三方服务"
              />
            </Form.Item>
          )}
          <Form.Item
            label="API Key"
            name="apiKey"
            extra={
              selectedServiceOption?.apiKeyUrl ? (
                <span className={styles['api-key-help']}>
                  不知道去哪找？请前往{' '}
                  <a
                    href={selectedServiceOption.apiKeyUrl}
                    rel="noreferrer noopener"
                    target="_blank"
                  >
                    <LinkOutlined /> {selectedServiceOption.label} API Key 页面
                  </a>
                </span>
              ) : undefined
            }
            rules={[
              { required: true, message: '请输入 API Key' },
              { min: 8, message: 'API Key 至少需要 8 个字符' },
              {
                validator: (_, value?: string) => {
                  if (!value || (!hasBlankCharacter(value) && value.trim() === value)) {
                    return Promise.resolve();
                  }

                  return Promise.reject(new Error('API Key 不能包含空白字符'));
                },
              },
            ]}
          >
            <Input.Password
              autoComplete="off"
              maxLength={1024}
              placeholder="粘贴第三方服务 API Key"
              visibilityToggle
            />
          </Form.Item>
          <Form.Item label="有效期" name="ttlOption" rules={[{ required: true }]}>
            <Select options={ttlOptions} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
