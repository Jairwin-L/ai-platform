import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Form, Input, Skeleton, Switch } from 'antd';
import {
  createThirdPartyServiceOption,
  getThirdPartyServiceOption,
  updateThirdPartyServiceOption,
} from '@/api/methods/settings';
import { useLiteDebounced } from '@/hooks';
import pageCss from '@/styles/page.module.scss';
import { serviceFormSchema, type ServiceFormValues } from './schemas';
import { getFormFieldErrors } from '@/utils/form';

const LIST_PATH = '/system/third-party-service';

const DEFAULT_VALUES: ServiceFormValues = { value: '', label: '', apiKeyUrl: '', enabled: true };

export default function ThirdPartyServiceForm({ serviceValue }: { serviceValue?: string }) {
  const navigate = useNavigate();
  const [form] = Form.useForm<ServiceFormValues>();
  const [loading, setLoading] = useState(Boolean(serviceValue));
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(serviceValue);

  useEffect(() => {
    if (!serviceValue) return;
    let active = true;

    getThirdPartyServiceOption(serviceValue)
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
  }, [form, serviceValue]);

  const onSubmit = useLiteDebounced(async (values: ServiceFormValues) => {
    const parsed = serviceFormSchema.safeParse(values);
    if (!parsed.success) {
      form.setFields(getFormFieldErrors(parsed.error.issues));
      return;
    }

    setSaving(true);
    try {
      if (serviceValue) {
        await updateThirdPartyServiceOption(serviceValue, parsed.data);
      } else {
        await createThirdPartyServiceOption(parsed.data);
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
          <h1>{isEditing ? '编辑第三方服务' : '新建第三方服务'}</h1>
          <p>{isEditing ? '更新第三方服务展示信息和可用状态。' : '创建用户可选择的第三方服务。'}</p>
        </div>
      </section>
      <section className={pageCss['form-panel']}>
        {loading ? <Skeleton active paragraph={{ rows: 5 }} /> : null}
        <Form
          className={loading ? pageCss.hidden : undefined}
          form={form}
          initialValues={DEFAULT_VALUES}
          layout="vertical"
          requiredMark="optional"
          onFinish={onSubmit}
        >
          <Form.Item
            label="服务标识"
            name="value"
            rules={[{ required: true, whitespace: true, message: '请输入服务标识' }]}
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
          <Form.Item label="API Key 链接" name="apiKeyUrl">
            <Input maxLength={2048} placeholder="https://service.example.com/api-keys" />
          </Form.Item>
          <Form.Item label="启用状态" name="enabled" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
          <div className={pageCss['form-actions']}>
            <Button onClick={onCancel}>取消</Button>
            <Button htmlType="submit" loading={saving} type="primary">
              {isEditing ? '保存更改' : '创建服务'}
            </Button>
          </div>
        </Form>
      </section>
    </div>
  );
}
