import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Divider, Form, Input, Select, Spin, Switch, Tabs } from 'antd';
import { GlobalOutlined, SaveOutlined, UserSwitchOutlined } from '@ant-design/icons';
import {
  getSystemSettings,
  updateSystemSettings,
  type SystemSettings,
} from '@/api/methods/settings';
import { PERMISSION_CODE } from '@ai/constants/permissions';
import { useLiteDebounced, usePermission } from '@/hooks';
import pageCss from '@/styles/page.module.scss';
import { settingsFormSchema, type SettingsFormValues } from './schemas';
import { getFormFieldErrors } from '@/utils/form';

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

export default function SystemSettingsPage() {
  const [form] = Form.useForm<SettingsFormValues>();
  const can = usePermission();
  // 只有 SETTINGS_READ 的账号只读查看，保存按钮不出现
  const canWrite = can(PERMISSION_CODE.OPERATION.SETTINGS.WRITE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      form.setFieldsValue(toFormValues(await getSystemSettings()));
    } catch {
      // 请求错误由全局响应拦截器提示
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    loadSettings().catch(() => undefined);
  }, [loadSettings]);

  const onSubmit = useLiteDebounced(async (values: SettingsFormValues) => {
    const parsed = settingsFormSchema.safeParse(values);
    if (!parsed.success) {
      form.setFields(getFormFieldErrors(parsed.error.issues));
      return;
    }

    setSaving(true);
    try {
      form.setFieldsValue(toFormValues(await updateSystemSettings(parsed.data)));
    } catch {
      // 请求错误由全局响应拦截器提示
    } finally {
      setSaving(false);
    }
  });

  const onReset = useLiteDebounced(() => {
    void loadSettings();
  });

  return (
    <div className={pageCss.page}>
      <section className={pageCss.heading}>
        <div>
          <h1>系统设置</h1>
          <p>管理可公开维护的展示与访问策略，不包含任何密钥、环境变量或部署配置。</p>
        </div>
      </section>
      <Card variant="borderless" style={{ maxWidth: 760 }}>
        {/* 表单始终挂载：加载中用遮罩，setFieldsValue 才有已连接的表单实例可写 */}
        <Spin spinning={loading}>
          <Form disabled={!canWrite} form={form} layout="vertical" onFinish={onSubmit}>
            <Tabs
              items={[
                {
                  key: 'general',
                  label: '常规',
                  icon: <GlobalOutlined />,
                  forceRender: true,
                  children: (
                    <>
                      <Form.Item
                        label="站点显示名称"
                        name="displayName"
                        rules={[{ required: true, whitespace: true, message: '请输入显示名称' }]}
                      >
                        <Input maxLength={80} />
                      </Form.Item>
                      <Form.Item label="默认语言" name="defaultLanguage">
                        <Select
                          options={[
                            { label: '简体中文', value: 'zh-CN' },
                            { label: 'English', value: 'en-US' },
                          ]}
                        />
                      </Form.Item>
                      <Form.Item
                        label="支持邮箱"
                        name="supportEmail"
                        extra="仅保存为管理员联系信息，不会用于发送邮件。"
                      >
                        <Input placeholder="support@example.com" type="email" />
                      </Form.Item>
                    </>
                  ),
                },
                {
                  key: 'access',
                  label: '访问策略',
                  icon: <UserSwitchOutlined />,
                  forceRender: true,
                  children: (
                    <>
                      <Form.Item
                        label="允许新用户注册"
                        name="allowRegistration"
                        valuePropName="checked"
                      >
                        <Switch checkedChildren="允许" unCheckedChildren="关闭" />
                      </Form.Item>
                      <Divider />
                      <Form.Item label="会话策略" name="sessionPolicy">
                        <Select
                          options={[
                            { label: '标准会话', value: 'standard' },
                            { label: '严格会话', value: 'strict' },
                          ]}
                        />
                      </Form.Item>
                      <Divider />
                      <Form.Item
                        label="BYOK 允许来源"
                        name="byokAllowedOrigins"
                        extra="每行一个精确 Origin，例如 https://example.com；留空会拒绝 BYOK 保存、删除和聊天请求。"
                      >
                        <Input.TextArea autoSize={{ minRows: 3, maxRows: 6 }} maxLength={2000} />
                      </Form.Item>
                      <Divider />
                      <Form.Item label="维护模式" name="maintenanceMode" valuePropName="checked">
                        <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                      </Form.Item>
                    </>
                  ),
                },
              ]}
            />
            {canWrite ? (
              <div className={pageCss['form-actions']}>
                <Button onClick={onReset}>恢复已保存值</Button>
                <Button htmlType="submit" icon={<SaveOutlined />} loading={saving} type="primary">
                  保存设置
                </Button>
              </div>
            ) : null}
          </Form>
        </Spin>
      </Card>
    </div>
  );
}
