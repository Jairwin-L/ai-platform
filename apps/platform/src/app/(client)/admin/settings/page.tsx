'use client';

import {
  GlobalOutlined,
  SaveOutlined,
  SettingOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import { App, Button, Card, Divider, Form, Input, Select, Switch, Tabs } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { getSystemSettings, updateSystemSettings, type SystemSettings } from '@/services/admin';
import styles from '../resource-page.module.scss';
import settingsStyles from './page.module.scss';

interface SettingsValues {
  allowRegistration: boolean;
  byokAllowedOrigins: string;
  defaultLanguage: 'en-US' | 'zh-CN';
  displayName: string;
  maintenanceMode: boolean;
  sessionPolicy: 'standard' | 'strict';
  supportEmail?: string;
}

const initialValues: SettingsValues = {
  displayName: 'Next.js Starter Kit',
  supportEmail: '',
  defaultLanguage: 'zh-CN',
  allowRegistration: true,
  byokAllowedOrigins: '',
  maintenanceMode: false,
  sessionPolicy: 'standard',
};

function getSettingsFormValues(settings: SystemSettings): SettingsValues {
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
  const { message } = App.useApp();
  const [form] = Form.useForm<SettingsValues>();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const settings = await getSystemSettings();
      form.setFieldsValue(getSettingsFormValues(settings));
    } catch (requestError) {
      const errorMessage =
        requestError instanceof Error ? requestError.message : '加载系统设置失败';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [form, message]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  async function onFinish(values: SettingsValues) {
    setSaving(true);
    try {
      await updateSystemSettings({
        ...values,
        supportEmail: values.supportEmail ?? '',
      });
      message.success('系统设置已保存');
    } catch (requestError) {
      message.error(requestError instanceof Error ? requestError.message : '保存系统设置失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.heading}>
        <div>
          <h1>
            <SettingOutlined /> 系统设置
          </h1>
          <p>管理可公开维护的展示与访问策略，不包含任何密钥、环境变量或部署配置。</p>
        </div>
      </section>
      <Card className={settingsStyles.card} loading={loading} variant="borderless">
        <Form form={form} initialValues={initialValues} layout="vertical" onFinish={onFinish}>
          <Tabs
            items={[
              {
                key: 'general',
                label: (
                  <>
                    <GlobalOutlined /> 常规
                  </>
                ),
                children: (
                  <div className={settingsStyles.section}>
                    <Form.Item
                      label="站点显示名称"
                      name="displayName"
                      rules={[{ required: true, whitespace: true, message: '请输入显示名称' }]}
                    >
                      <Input maxLength={80} placeholder="应用名称" />
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
                  </div>
                ),
              },
              {
                key: 'access',
                label: (
                  <>
                    <UserSwitchOutlined /> 访问策略
                  </>
                ),
                children: (
                  <div className={settingsStyles.section}>
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
                      <Input.TextArea
                        autoSize={{ minRows: 3, maxRows: 6 }}
                        maxLength={2000}
                        placeholder="https://example.com"
                      />
                    </Form.Item>
                    <Divider />
                    <Form.Item label="维护模式" name="maintenanceMode" valuePropName="checked">
                      <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                    </Form.Item>
                  </div>
                ),
              },
            ]}
          />
          <div className={settingsStyles.footer}>
            <Button
              htmlType="button"
              onClick={async () => {
                await loadSettings();
              }}
            >
              恢复已保存值
            </Button>
            <Button
              icon={<SaveOutlined />}
              loading={saving}
              type="primary"
              onClick={() => form.submit()}
            >
              保存设置
            </Button>
          </div>
        </Form>
      </Card>
    </main>
  );
}
