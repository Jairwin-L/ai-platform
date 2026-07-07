'use client';

import { ApiOutlined, ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { Button, Form, Input, Select, Skeleton, Switch } from 'antd';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  createAdminThirdPartyServiceOption,
  getAdminThirdPartyServiceOption,
  updateAdminThirdPartyServiceOption,
  type ThirdPartyServiceOption,
} from '@/api/modules/admin';
import { useDebounced } from '@/hooks/use-debounced';

const defaultServiceValues: IAppForms.ThirdPartyServiceOptionValues = {
  apiKeyUrl: '',
  color: 'green',
  enabled: true,
  label: '',
  value: '',
};

const serviceColorOptions = [
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

const serviceValuePatternMessage = '服务标识只能包含小写字母、数字和连字符';
const serviceValuePattern = /^[a-z0-9][a-z0-9-]{0,39}$/u;

type ThirdPartyServiceFormStyles = Record<string, string>;

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

function getServicePayload(
  values: IAppForms.ThirdPartyServiceOptionValues,
): ThirdPartyServiceOption {
  const apiKeyUrl = values.apiKeyUrl?.trim();

  return {
    value: values.value.trim(),
    label: values.label.trim(),
    color: values.color,
    ...(apiKeyUrl ? { apiKeyUrl } : {}),
    enabled: values.enabled,
  };
}

export function ThirdPartyServiceForm({
  serviceValue,
  styles,
}: {
  serviceValue?: string;
  styles: ThirdPartyServiceFormStyles;
}) {
  const router = useRouter();
  const [form] = Form.useForm<IAppForms.ThirdPartyServiceOptionValues>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(serviceValue);
  const description = isEditing
    ? '更新第三方服务展示信息和可用状态。'
    : '创建用户可选择的第三方服务。';

  const loadForm = useCallback(async () => {
    setLoading(true);

    if (!serviceValue) {
      form.setFieldsValue(defaultServiceValues);
      setLoading(false);
      return;
    }

    try {
      const serviceOption = await getAdminThirdPartyServiceOption(serviceValue);

      form.setFieldsValue(serviceOption);
    } catch {
      // 请求错误由 alova 全局提示处理。
    } finally {
      setLoading(false);
    }
  }, [form, serviceValue]);

  useEffect(() => {
    loadForm();
  }, [loadForm]);

  async function onFinish(values: IAppForms.ThirdPartyServiceOptionValues): Promise<void> {
    const payload = getServicePayload(values);

    setSaving(true);
    try {
      if (serviceValue) {
        await updateAdminThirdPartyServiceOption(serviceValue, payload);
      } else {
        await createAdminThirdPartyServiceOption(payload);
      }
      router.push('/admin/settings/third-party-service');
    } catch {
      // 请求错误由 alova 全局提示处理。
    } finally {
      setSaving(false);
    }
  }
  const debouncedFinish = useDebounced(onFinish, 300);

  return (
    <main className={styles.page}>
      <section className={styles.heading}>
        <Button
          icon={<ArrowLeftOutlined />}
          type="text"
          onClick={() => router.push('/admin/settings/third-party-service')}
        >
          返回第三方服务列表
        </Button>
        <h1>
          <ApiOutlined /> {isEditing ? '编辑第三方服务' : '新建第三方服务'}
        </h1>
        <p>{description}</p>
      </section>
      <section className={styles.panel}>
        {loading && <Skeleton active paragraph={{ rows: 5 }} />}
        <Form
          className={loading ? styles.hidden : undefined}
          form={form}
          initialValues={defaultServiceValues}
          layout="vertical"
          requiredMark="optional"
          onFinish={debouncedFinish}
        >
          <Form.Item
            label="服务标识"
            name="value"
            rules={[
              { required: true, whitespace: true, message: '请输入服务标识' },
              {
                pattern: serviceValuePattern,
                message: serviceValuePatternMessage,
              },
            ]}
          >
            <Input maxLength={40} placeholder="tinypng" />
          </Form.Item>
          <Form.Item
            label="展示名称"
            name="label"
            rules={[{ required: true, whitespace: true, message: '请输入展示名称' }]}
          >
            <Input maxLength={40} placeholder="TinyPNG" />
          </Form.Item>
          <Form.Item
            label="标签颜色"
            name="color"
            rules={[{ required: true, message: '请选择标签颜色' }]}
          >
            <Select options={serviceColorOptions} />
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
            <Input maxLength={2048} placeholder="https://service.example.com/api-keys" />
          </Form.Item>
          <Form.Item label="启用状态" name="enabled" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
          <div className={styles.actions}>
            <Button onClick={() => router.push('/admin/settings/third-party-service')}>取消</Button>
            <Button htmlType="submit" icon={<SaveOutlined />} loading={saving} type="primary">
              {isEditing ? '保存更改' : '创建服务'}
            </Button>
          </div>
        </Form>
      </section>
    </main>
  );
}
