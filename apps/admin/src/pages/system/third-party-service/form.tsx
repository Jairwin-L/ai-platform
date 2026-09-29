import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Form, Skeleton } from 'antd';
import { ArrowLeftOutlined, ApiOutlined, SaveOutlined } from '@ant-design/icons';
import {
  createThirdPartyServiceOption,
  getThirdPartyServiceOption,
  updateThirdPartyServiceOption,
} from '@/api/methods/settings';
import FormItems from '@/components/form-items';
import Exception from '@/components/exception';
import css from '@/components/resource-page/index.module.scss';
import { defaultValues, getFormItems } from './form-item-config';
import { serviceFormSchema, type ServiceFormValues } from './schemas';

const SERVICE_LIST_PATH = '/system/third-party-service';

export default function FormPage({ serviceValue }: { serviceValue?: string }) {
  const navigate = useNavigate();
  const [form] = Form.useForm<ServiceFormValues>();
  const [loading, setLoading] = useState(Boolean(serviceValue));
  const [saving, setSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const isEditing = Boolean(serviceValue);
  const formItems = useMemo(() => getFormItems(), []);

  const loadForm = useCallback(async () => {
    if (!serviceValue) return;
    setLoading(true);
    setLoadFailed(false);
    try {
      const response = await getThirdPartyServiceOption(serviceValue);
      const option = response.data;
      if (option) form.setFieldsValue({ ...option, apiKeyUrl: option.apiKeyUrl ?? '' });
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [form, serviceValue]);

  useEffect(() => {
    loadForm().catch(() => undefined);
  }, [loadForm]);

  const onBackToServices = () => {
    void navigate(SERVICE_LIST_PATH);
  };

  const onFinish = async (values: ServiceFormValues) => {
    // 字段规则已逐项校验过，这里再整体解析一次拿到归一化后的提交值（空链接转 undefined）
    const parsed = serviceFormSchema.safeParse(values);
    if (!parsed.success) return;

    setSaving(true);
    try {
      if (serviceValue) {
        await updateThirdPartyServiceOption(serviceValue, parsed.data);
      } else {
        await createThirdPartyServiceOption(parsed.data);
      }
      onBackToServices();
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
          <Button icon={<ArrowLeftOutlined />} type="text" onClick={onBackToServices}>
            返回服务列表
          </Button>
          <h1>
            <ApiOutlined /> {isEditing ? '编辑第三方服务' : '新建第三方服务'}
          </h1>
          <p>{isEditing ? '更新第三方服务展示信息和可用状态。' : '创建用户可选择的第三方服务。'}</p>
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
            <Button onClick={onBackToServices}>取消</Button>
            <Button htmlType="submit" icon={<SaveOutlined />} loading={saving} type="primary">
              {isEditing ? '保存更改' : '创建服务'}
            </Button>
          </div>
        </Form>
      </section>
    </main>
  );
}
