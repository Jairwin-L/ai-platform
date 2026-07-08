'use client';

import { KeyOutlined, LinkOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Form, Input, Modal, Select, Table, Tag } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import {
  getAiModelConfigs,
  updateDefaultAiModelConfig,
  type AiChatModelConfig,
} from '@/api/modules/ai-chat';
import {
  createAiCredential,
  deleteAiCredential,
  getAiCredentials,
  getAiProviderOptions,
  overwriteAiCredential,
  type AiCredential,
  type AiCredentialProvider,
  type AiCredentialTtlOption,
  type AiProviderOption,
  type OverwriteAiCredentialPayload,
  type SaveAiCredentialPayload,
} from '@/api/modules/ai-credentials';
import { buildAiCredentialColumns } from './credential-columns';
import { DefaultModelConfigPanel } from './default-model-config-panel';
import styles from './page.module.scss';
import { MODAL_OPTION } from '@/constants/antd';
import { useDebounced } from '@/hooks/use-debounced';

const initialValues: IAppForms.CredentialFormValues = {
  label: '',
  provider: '',
  apiKey: '',
  ttlOption: '7d',
};

const ttlOptions: Array<{ label: string; value: AiCredentialTtlOption }> = [
  { label: '7 天', value: '7d' },
  { label: '2 周', value: '2w' },
  { label: '3 周', value: '3w' },
  { label: '4 周', value: '4w' },
];

function getProviderOption(providerOptions: AiProviderOption[], provider: AiCredentialProvider) {
  return providerOptions.find((item) => item.value === provider);
}

function hasBlankCharacter(value: string): boolean {
  return /\s/u.test(value);
}

export default function AiSettingsPage() {
  const [form] = Form.useForm<IAppForms.CredentialFormValues>();
  const selectedProvider = Form.useWatch('provider', form);
  const [credentials, setCredentials] = useState<AiCredential[]>([]);
  const [modelConfigs, setModelConfigs] = useState<AiChatModelConfig[]>([]);
  const [providerOptions, setProviderOptions] = useState<AiProviderOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [defaultModelSaving, setDefaultModelSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [overwriteCredential, setOverwriteCredential] = useState<AiCredential | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [credentialsResult, providerOptionsResult, modelConfigsResult] = await Promise.allSettled(
      [getAiCredentials(), getAiProviderOptions(), getAiModelConfigs()],
    );

    if (credentialsResult.status === 'fulfilled') {
      setCredentials(credentialsResult.value);
    } else {
      setCredentials([]);
    }

    if (providerOptionsResult.status === 'fulfilled') {
      setProviderOptions(providerOptionsResult.value);
    } else {
      setProviderOptions([]);
    }

    if (modelConfigsResult.status === 'fulfilled') {
      setModelConfigs(modelConfigsResult.value);
    } else {
      setModelConfigs([]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData().catch(() => undefined);
  }, [loadData]);

  const usedProviderValues = new Set(credentials.map((credential) => credential.provider));
  const availableProviderOptions = providerOptions.filter(
    (option) => !usedProviderValues.has(option.value),
  );

  function onCreateClick(): void {
    setOverwriteCredential(null);
    form.setFieldsValue({
      ...initialValues,
      provider: availableProviderOptions[0]?.value ?? initialValues.provider,
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

  function onOverwriteClick(credential: AiCredential): void {
    setOverwriteCredential(credential);
    form.setFieldsValue({
      apiKey: '',
      label: credential.label,
      provider: credential.provider,
      ttlOption: initialValues.ttlOption,
    });
    setModalOpen(true);
  }

  async function onFinish(values: IAppForms.CredentialFormValues): Promise<void> {
    setSaving(true);

    try {
      if (overwriteCredential) {
        const payload: OverwriteAiCredentialPayload = {
          credentialId: overwriteCredential.credentialId,
          label: values.label.trim(),
          apiKey: values.apiKey.trim(),
          ttlOption: values.ttlOption,
        };

        await overwriteAiCredential(payload);
      } else {
        const payload: SaveAiCredentialPayload = {
          ...values,
          label: values.label.trim(),
          apiKey: values.apiKey.trim(),
        };

        await createAiCredential(payload);
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

  async function onDeleteConfirm(credential: AiCredential): Promise<void> {
    setDeletingId(credential.credentialId);

    try {
      await deleteAiCredential(credential.credentialId);
      await loadData();
    } catch {
      // 请求错误由 alova 全局提示处理。
    } finally {
      setDeletingId(null);
    }
  }

  async function onDefaultModelChange(modelConfigId: string): Promise<void> {
    const modelConfig = modelConfigs.find((item) => item.id === modelConfigId);

    if (!modelConfig || defaultModelSaving) {
      return;
    }

    setDefaultModelSaving(true);

    try {
      await updateDefaultAiModelConfig({
        credentialId: modelConfig.providerConfigId,
        modelId: modelConfig.modelId,
      });
      await loadData();
    } catch {
      // 请求错误由 alova 全局提示处理。
    } finally {
      setDefaultModelSaving(false);
    }
  }
  const debouncedDeleteConfirm = useDebounced(onDeleteConfirm, 300);
  const debouncedRefresh = useDebounced(() => {
    loadData().catch(() => undefined);
  }, 300);
  const debouncedModalSubmit = useDebounced(() => {
    form.submit();
  }, 300);

  const selectedProviderOption = getProviderOption(
    providerOptions,
    selectedProvider ?? availableProviderOptions[0]?.value ?? initialValues.provider,
  );
  const isOverwriteMode = Boolean(overwriteCredential);
  const overwriteProviderOption = overwriteCredential
    ? getProviderOption(providerOptions, overwriteCredential.provider)
    : undefined;

  const columns = buildAiCredentialColumns({
    deletingId,
    providerOptions,
    onDeleteConfirm: async (credential) => {
      await debouncedDeleteConfirm(credential);
    },
    onOverwriteClick,
  });
  return (
    <>
      <main className={styles.page}>
        <section className={styles.heading}>
          <div>
            <h1>
              <KeyOutlined /> AI 密钥管理
            </h1>
            <p>保存和维护当前账号可用的 AI Provider 密钥，列表仅展示脱敏信息。</p>
          </div>
          <Button
            disabled={!availableProviderOptions.length}
            icon={<PlusOutlined />}
            type="primary"
            onClick={onCreateClick}
          >
            新增密钥
          </Button>
        </section>
        <DefaultModelConfigPanel
          loading={loading}
          models={modelConfigs}
          saving={defaultModelSaving}
          onDefaultModelChange={onDefaultModelChange}
        />
        <section className={styles.panel}>
          <div className={styles.filters}>
            <span className={styles.summary}>共 {credentials.length} 个密钥</span>
            <Button icon={<ReloadOutlined />} onClick={debouncedRefresh}>
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
        okText={isOverwriteMode ? '覆盖密钥' : '保存密钥'}
        open={modalOpen}
        title={isOverwriteMode ? '覆盖 AI 密钥' : '新增 AI 密钥'}
        onCancel={onModalCancel}
        onOk={debouncedModalSubmit}
      >
        <p className={styles['modal-help']}>
          {isOverwriteMode
            ? '仅覆盖密钥名称、API Key 和有效期，Provider 保持不变。覆盖后列表仍只展示脱敏尾号。'
            : 'API Key 保存后只展示脱敏尾号。请确认密钥可用于所选 Provider，过期后需要重新添加。'}
        </p>
        <Form
          form={form}
          initialValues={{
            ...initialValues,
            provider: availableProviderOptions[0]?.value ?? initialValues.provider,
          }}
          layout="vertical"
          preserve={false}
          onFinish={onFinish}
        >
          <Form.Item
            label="密钥名称"
            name="label"
            rules={[{ required: true, whitespace: true, message: '请输入密钥名称' }]}
          >
            <Input maxLength={80} placeholder="例如：工作密钥" />
          </Form.Item>
          {isOverwriteMode ? (
            <Form.Item label="Provider">
              <div className={styles['readonly-value']}>
                <Tag>{overwriteProviderOption?.label ?? overwriteCredential?.provider}</Tag>
              </div>
            </Form.Item>
          ) : (
            <Form.Item label="Provider" name="provider" rules={[{ required: true }]}>
              <Select
                options={providerOptions.map((option) => ({
                  disabled: usedProviderValues.has(option.value),
                  label: option.label,
                  value: option.value,
                }))}
                placeholder="请选择 Provider"
              />
            </Form.Item>
          )}
          <Form.Item
            label="API Key"
            name="apiKey"
            extra={
              selectedProviderOption?.apiKeyUrl ? (
                <span className={styles['api-key-help']}>
                  不知道去哪找？请前往{' '}
                  <a
                    href={selectedProviderOption.apiKeyUrl}
                    rel="noreferrer noopener"
                    target="_blank"
                  >
                    <LinkOutlined /> {selectedProviderOption.label} API Key 页面
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
              maxLength={512}
              placeholder="粘贴 Provider API Key"
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
