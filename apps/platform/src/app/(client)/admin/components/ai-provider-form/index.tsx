'use client';

import { ArrowLeftOutlined, RobotOutlined, SaveOutlined } from '@ant-design/icons';
import { Button, Form, Input, Select, Skeleton, Switch } from 'antd';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  createAdminAiProviderOption,
  getAdminAiProviderOption,
  updateAdminAiProviderOption,
  type AiProviderOption,
} from '@/api/modules/admin';
import { BYOK_PROVIDER_VALUE_PATTERN } from '@/lib/ai/byok/constants';

const defaultProviderValues: IAppForms.ProviderOptionValues = {
  apiKeyUrl: '',
  chatBaseUrl: '',
  color: 'processing',
  enabled: true,
  label: '',
  models: [],
  protocol: 'chat-completions',
  value: '',
};

const providerColorOptions = [
  'default',
  'processing',
  'success',
  'warning',
  'error',
  'blue',
  'cyan',
  'geekblue',
  'gold',
  'green',
  'lime',
  'magenta',
  'orange',
  'purple',
  'red',
  'volcano',
].map((color) => ({ label: color, value: color }));

const providerProtocolOptions: Array<{ label: string; value: IByok.AiProviderProtocol }> = [
  { label: 'Chat Completions', value: 'chat-completions' },
  { label: 'Messages', value: 'messages' },
  { label: 'Generate Content', value: 'generate-content' },
];

const providerValuePatternMessage =
  'Provider 标识只能包含小写字母、数字、下划线和连字符，且必须以小写字母开头';

type AiProviderFormStyles = Record<string, string>;

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

function getProviderPayload(values: IAppForms.ProviderOptionValues): AiProviderOption {
  const apiKeyUrl = values.apiKeyUrl?.trim();

  return {
    value: values.value.trim(),
    label: values.label.trim(),
    color: values.color,
    ...(apiKeyUrl ? { apiKeyUrl } : {}),
    protocol: values.protocol,
    chatBaseUrl: values.chatBaseUrl.trim(),
    models: Array.from(new Set((values.models ?? []).map((model) => model.trim()).filter(Boolean))),
    enabled: values.enabled,
  };
}

export function AiProviderForm({
  providerValue,
  styles,
}: {
  providerValue?: string;
  styles: AiProviderFormStyles;
}) {
  const router = useRouter();
  const [form] = Form.useForm<IAppForms.ProviderOptionValues>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(providerValue);
  const description = isEditing
    ? '更新 Provider 连接配置和可用状态。'
    : '创建用户可选择的 AI Provider。';

  const loadForm = useCallback(async () => {
    setLoading(true);

    if (!providerValue) {
      form.setFieldsValue(defaultProviderValues);
      setLoading(false);
      return;
    }

    try {
      const providerOption = await getAdminAiProviderOption(providerValue);

      form.setFieldsValue(providerOption);
    } catch {
      // 请求错误由 alova 全局提示处理。
    } finally {
      setLoading(false);
    }
  }, [form, providerValue]);

  useEffect(() => {
    loadForm();
  }, [loadForm]);

  async function onFinish(values: IAppForms.ProviderOptionValues): Promise<void> {
    const payload = getProviderPayload(values);

    setSaving(true);
    try {
      if (providerValue) {
        await updateAdminAiProviderOption(providerValue, payload);
      } else {
        await createAdminAiProviderOption(payload);
      }
      router.push('/admin/settings/ai-provider');
    } catch {
      // 请求错误由 alova 全局提示处理。
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.heading}>
        <Button
          icon={<ArrowLeftOutlined />}
          type="text"
          onClick={() => router.push('/admin/settings/ai-provider')}
        >
          返回 Provider 列表
        </Button>
        <h1>
          <RobotOutlined /> {isEditing ? '编辑 AI Provider' : '新建 AI Provider'}
        </h1>
        <p>{description}</p>
      </section>
      <section className={styles.panel}>
        {loading && <Skeleton active paragraph={{ rows: 8 }} />}
        <Form
          className={loading ? styles.hidden : undefined}
          form={form}
          initialValues={defaultProviderValues}
          layout="vertical"
          requiredMark="optional"
          onFinish={onFinish}
        >
          <Form.Item
            label="Provider 标识"
            name="value"
            rules={[
              { required: true, whitespace: true, message: '请输入 Provider 标识' },
              {
                pattern: BYOK_PROVIDER_VALUE_PATTERN,
                message: providerValuePatternMessage,
              },
            ]}
          >
            <Input maxLength={40} placeholder="provider_key" />
          </Form.Item>
          <Form.Item
            label="展示名称"
            name="label"
            rules={[{ required: true, whitespace: true, message: '请输入展示名称' }]}
          >
            <Input maxLength={40} placeholder="展示名称" />
          </Form.Item>
          <Form.Item
            label="标签颜色"
            name="color"
            rules={[{ required: true, message: '请选择标签颜色' }]}
          >
            <Select options={providerColorOptions} />
          </Form.Item>
          <Form.Item
            label="API Key 链接"
            name="apiKeyUrl"
            rules={[
              { max: 2048, message: 'API Key 链接不能超过 2048 个字符' },
              {
                validator: (_, value?: string) => {
                  const trimmedValue = value?.trim();

                  if (!trimmedValue || isHttpsUrl(trimmedValue)) {
                    return Promise.resolve();
                  }

                  return Promise.reject(new Error('请输入有效的 https 链接'));
                },
              },
            ]}
          >
            <Input maxLength={2048} placeholder="https://platform.example.com/api-keys" />
          </Form.Item>
          <Form.Item
            label="协议"
            name="protocol"
            rules={[{ required: true, message: '请选择协议' }]}
          >
            <Select options={providerProtocolOptions} />
          </Form.Item>
          <Form.Item
            label="Chat Base URL"
            name="chatBaseUrl"
            rules={[
              { required: true, whitespace: true, message: '请输入调用地址' },
              { max: 2048, message: '调用地址不能超过 2048 个字符' },
              {
                validator: (_, value?: string) => {
                  const trimmedValue = value?.trim();

                  if (trimmedValue && isHttpsUrl(trimmedValue)) {
                    return Promise.resolve();
                  }

                  return Promise.reject(new Error('请输入有效的 https 调用地址'));
                },
              },
            ]}
          >
            <Input maxLength={2048} placeholder="https://api.example.com/v1/chat/completions" />
          </Form.Item>
          <Form.Item
            label="模型"
            name="models"
            rules={[
              {
                validator: (_, value?: string[]) => {
                  if (value?.some((model) => model.trim())) {
                    return Promise.resolve();
                  }

                  return Promise.reject(new Error('请至少配置一个模型'));
                },
              },
            ]}
          >
            <Select
              mode="tags"
              open={false}
              placeholder="输入模型名称后回车"
              tokenSeparators={[',', '\n']}
            />
          </Form.Item>
          <Form.Item label="启用状态" name="enabled" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
          <div className={styles.actions}>
            <Button onClick={() => router.push('/admin/settings/ai-provider')}>取消</Button>
            <Button htmlType="submit" icon={<SaveOutlined />} loading={saving} type="primary">
              {isEditing ? '保存更改' : '创建 Provider'}
            </Button>
          </div>
        </Form>
      </section>
    </main>
  );
}
