import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Skeleton, Tabs } from 'antd';
import { GlobalOutlined, SaveOutlined, ToolOutlined, UserSwitchOutlined } from '@ant-design/icons';
import { PERMISSION_CODE } from '@ai/constants/permissions';
import {
  getSystemSettings,
  updateSystemSettings,
  type SystemSettings,
} from '@/api/methods/settings';
import { usePermission } from '@/hooks';
import FormItems from '@/components/form-items';
import Exception from '@/components/exception';
import css from '@/components/resource-page/index.module.scss';
import { FIELD_TAB_MAP, defaultValues, getAccessItems, getGeneralItems } from './form-item-config';
import { settingsFormSchema, type SettingsFormValues } from './schemas';

interface FinishFailedInfo {
  errorFields: Array<{ name: Array<string | number> }>;
}

function toFormValues(settings: SystemSettings): SettingsFormValues {
  return {
    displayName: settings.displayName,
    supportEmail: settings.supportEmail,
    defaultLanguage: settings.defaultLanguage,
    allowRegistration: settings.allowRegistration,
    byokAllowedOrigins: settings.byokAllowedOrigins,
    maintenanceMode: settings.maintenanceMode,
    sessionPolicy: settings.sessionPolicy,
  };
}

export default function Page() {
  const [form] = Form.useForm<SettingsFormValues>();
  const can = usePermission();
  // 只有 SETTINGS_READ 的账号只读查看，保存按钮不出现
  const canWrite = can(PERMISSION_CODE.OPERATION.SETTINGS.WRITE);
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      form.setFieldsValue(toFormValues(await getSystemSettings()));
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    loadSettings().catch(() => undefined);
  }, [loadSettings]);

  // 校验失败的字段可能在另一个 tab 里，不切过去用户看不到标红的字段
  const onFinishFailed = ({ errorFields }: FinishFailedInfo) => {
    const firstField = errorFields[0]?.name?.[0];
    const targetTab =
      typeof firstField === 'string'
        ? FIELD_TAB_MAP[firstField as keyof SettingsFormValues]
        : undefined;
    if (targetTab) setActiveTab(targetTab);
  };

  const onFinish = async (values: SettingsFormValues) => {
    const parsed = settingsFormSchema.safeParse(values);
    if (!parsed.success) return;

    setSaving(true);
    try {
      form.setFieldsValue(toFormValues(await updateSystemSettings(parsed.data)));
    } catch {
      // 接口错误已由全局响应拦截器提示
    } finally {
      setSaving(false);
    }
  };

  const onReset = () => {
    loadSettings().catch(() => undefined);
  };

  if (loadFailed) return <Exception onClick={loadSettings} />;

  return (
    <main className={css.page}>
      <section className={css.heading}>
        <div>
          <h1>
            <ToolOutlined /> 基础配置
          </h1>
          <p>管理可公开维护的展示与访问策略，不包含任何密钥、环境变量或部署配置。</p>
        </div>
      </section>

      <Alert
        className={css.alert}
        description="接口只读写安全的展示与访问策略字段。密钥、连接串、部署地址和环境变量均不会显示或修改。"
        showIcon
        title="安全边界"
        type="info"
      />

      <Card variant="borderless">
        {loading ? <Skeleton active paragraph={{ rows: 8 }} /> : null}
        {/* 表单始终挂载，加载中只隐藏：setFieldsValue 需要已连接的表单实例 */}
        <Form
          className={loading ? css.hidden : undefined}
          disabled={!canWrite}
          form={form}
          initialValues={defaultValues}
          layout="vertical"
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
        >
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'general',
                forceRender: true,
                icon: <GlobalOutlined />,
                label: '常规',
                children: <FormItems items={getGeneralItems()} />,
              },
              {
                key: 'access',
                forceRender: true,
                icon: <UserSwitchOutlined />,
                label: '访问策略',
                children: <FormItems items={getAccessItems()} />,
              },
            ]}
          />
          {canWrite ? (
            <div className={css['form-actions']}>
              <Button onClick={onReset}>恢复已保存值</Button>
              <Button htmlType="submit" icon={<SaveOutlined />} loading={saving} type="primary">
                保存设置
              </Button>
            </div>
          ) : null}
        </Form>
      </Card>
    </main>
  );
}
