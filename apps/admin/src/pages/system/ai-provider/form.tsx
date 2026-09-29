import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Form, Skeleton } from 'antd';
import { ArrowLeftOutlined, RobotOutlined, SaveOutlined } from '@ant-design/icons';
import {
  createAiProviderOption,
  getAiProviderOption,
  updateAiProviderOption,
} from '@/api/methods/settings';
import FormItems from '@/components/form-items';
import Exception from '@/components/exception';
import css from '@/components/resource-page/index.module.scss';
import { defaultValues, getFormItems } from './form-item-config';
import { providerFormSchema, type ProviderFormValues } from './schemas';

const PROVIDER_LIST_PATH = '/system/ai-provider';

export default function FormPage({ providerValue }: { providerValue?: string }) {
  const navigate = useNavigate();
  const [form] = Form.useForm<ProviderFormValues>();
  const [loading, setLoading] = useState(Boolean(providerValue));
  const [saving, setSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const isEditing = Boolean(providerValue);
  const formItems = useMemo(() => getFormItems(), []);

  const loadForm = useCallback(async () => {
    if (!providerValue) return;
    setLoading(true);
    setLoadFailed(false);
    try {
      const response = await getAiProviderOption(providerValue);
      const option = response.data;
      if (option) form.setFieldsValue({ ...option, apiKeyUrl: option.apiKeyUrl ?? '' });
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [form, providerValue]);

  useEffect(() => {
    loadForm().catch(() => undefined);
  }, [loadForm]);

  const onBackToProviders = () => {
    void navigate(PROVIDER_LIST_PATH);
  };

  const onFinish = async (values: ProviderFormValues) => {
    // 字段规则已逐项校验过，这里再整体解析一次拿到归一化后的提交值（模型去重、空链接转 undefined）
    const parsed = providerFormSchema.safeParse(values);
    if (!parsed.success) return;

    setSaving(true);
    try {
      if (providerValue) {
        await updateAiProviderOption(providerValue, parsed.data);
      } else {
        await createAiProviderOption(parsed.data);
      }
      onBackToProviders();
    } catch {
      // 接口错误已由全局响应拦截器提示
    } finally {
      setSaving(false);
    }
  };

  if (loadFailed) return <Exception onClick={loadForm} />;

  return (
    <main className={css.page}>
      <section className={css.heading}>
        <div>
          <Button icon={<ArrowLeftOutlined />} type="text" onClick={onBackToProviders}>
            返回 Provider 列表
          </Button>
          <h1>
            <RobotOutlined /> {isEditing ? '编辑 AI Provider' : '新建 AI Provider'}
          </h1>
          <p>
            {isEditing ? '更新 Provider 连接配置和可用状态。' : '创建用户可选择的 AI Provider。'}
          </p>
        </div>
      </section>

      <section className={css.panel}>
        {loading ? <Skeleton active paragraph={{ rows: 8 }} /> : null}
        <Form
          className={loading ? css.hidden : undefined}
          form={form}
          initialValues={defaultValues}
          layout="vertical"
          onFinish={onFinish}
        >
          <div className={css['form-grid']}>
            <FormItems items={formItems} />
          </div>
          <div className={css['form-actions']}>
            <Button onClick={onBackToProviders}>取消</Button>
            <Button htmlType="submit" icon={<SaveOutlined />} loading={saving} type="primary">
              {isEditing ? '保存更改' : '创建 Provider'}
            </Button>
          </div>
        </Form>
      </section>
    </main>
  );
}
