import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Form, Input, Select, Skeleton, Switch } from 'antd';
import {
  createAiProviderOption,
  getAiProviderOption,
  updateAiProviderOption,
} from '@/api/methods/settings';
import { PROVIDER_PROTOCOL_OPTIONS } from '@/constants/permission';
import { useLiteDebounced } from '@/hooks';
import pageCss from '@/styles/page.module.scss';
import { providerFormSchema, type ProviderFormValues } from './schemas';
import { getFormFieldErrors } from '@/utils/form';

const LIST_PATH = '/system/ai-provider';

const DEFAULT_VALUES: ProviderFormValues = {
  value: '',
  label: '',
  apiKeyUrl: '',
  protocol: 'chat-completions',
  chatBaseUrl: '',
  models: [],
  enabled: true,
};

export default function AiProviderForm({ providerValue }: { providerValue?: string }) {
  const navigate = useNavigate();
  const [form] = Form.useForm<ProviderFormValues>();
  const [loading, setLoading] = useState(Boolean(providerValue));
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(providerValue);

  useEffect(() => {
    if (!providerValue) return;
    let active = true;

    getAiProviderOption(providerValue)
      .then((option) => {
        if (active) form.setFieldsValue({ ...option, apiKeyUrl: option.apiKeyUrl ?? '' });
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [form, providerValue]);

  const onSubmit = useLiteDebounced(async (values: ProviderFormValues) => {
    const parsed = providerFormSchema.safeParse(values);
    if (!parsed.success) {
      form.setFields(getFormFieldErrors(parsed.error.issues));
      return;
    }

    setSaving(true);
    try {
      if (providerValue) {
        await updateAiProviderOption(providerValue, parsed.data);
      } else {
        await createAiProviderOption(parsed.data);
      }
      void navigate(LIST_PATH);
    } catch {
      // 请求错误由全局响应拦截器提示
    } finally {
      setSaving(false);
    }
  });

  const onCancel = () => {
    void navigate(LIST_PATH);
  };

  return (
    <div className={pageCss.page}>
      <section className={pageCss.heading}>
        <div>
          <h1>{isEditing ? '编辑 AI Provider' : '新建 AI Provider'}</h1>
          <p>
            {isEditing ? '更新 Provider 连接配置和可用状态。' : '创建用户可选择的 AI Provider。'}
          </p>
        </div>
      </section>
      <section className={pageCss['form-panel']}>
        {loading ? <Skeleton active paragraph={{ rows: 8 }} /> : null}
        <Form
          className={loading ? pageCss.hidden : undefined}
          form={form}
          initialValues={DEFAULT_VALUES}
          layout="vertical"
          requiredMark="optional"
          onFinish={onSubmit}
        >
          <Form.Item
            label="Provider 标识"
            name="value"
            rules={[{ required: true, whitespace: true, message: '请输入 Provider 标识' }]}
          >
            <Input maxLength={40} placeholder="provider_key" />
          </Form.Item>
          <Form.Item
            label="展示名称"
            name="label"
            rules={[{ required: true, whitespace: true, message: '请输入展示名称' }]}
          >
            <Input maxLength={40} />
          </Form.Item>
          <Form.Item label="API Key 链接" name="apiKeyUrl">
            <Input maxLength={2048} placeholder="https://platform.example.com/api-keys" />
          </Form.Item>
          <Form.Item
            label="协议"
            name="protocol"
            rules={[{ required: true, message: '请选择协议' }]}
          >
            <Select options={PROVIDER_PROTOCOL_OPTIONS} />
          </Form.Item>
          <Form.Item
            label="Chat Base URL"
            name="chatBaseUrl"
            rules={[{ required: true, whitespace: true, message: '请输入调用地址' }]}
          >
            <Input maxLength={2048} placeholder="https://api.example.com/v1/chat/completions" />
          </Form.Item>
          <Form.Item
            label="模型"
            name="models"
            rules={[{ required: true, message: '请至少配置一个模型' }]}
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
          <div className={pageCss['form-actions']}>
            <Button onClick={onCancel}>取消</Button>
            <Button htmlType="submit" loading={saving} type="primary">
              {isEditing ? '保存更改' : '创建 Provider'}
            </Button>
          </div>
        </Form>
      </section>
    </div>
  );
}
