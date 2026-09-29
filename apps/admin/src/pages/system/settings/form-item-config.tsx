import { Input, Select, Switch } from 'antd';
import type { FormItemConfig } from '@/components/form-items';
import { getSettingsRules, type SettingsFormValues } from './schemas';

type SettingsField = keyof SettingsFormValues;

/** 每个字段所在的 tab，校验失败时据此切到报错字段所在的 tab */
export const FIELD_TAB_MAP: Record<SettingsField, 'general' | 'access'> = {
  displayName: 'general',
  defaultLanguage: 'general',
  supportEmail: 'general',
  allowRegistration: 'access',
  sessionPolicy: 'access',
  byokAllowedOrigins: 'access',
  maintenanceMode: 'access',
};

export const defaultValues: SettingsFormValues = {
  displayName: '',
  supportEmail: '',
  defaultLanguage: 'zh-CN',
  allowRegistration: true,
  byokAllowedOrigins: '',
  maintenanceMode: false,
  sessionPolicy: 'standard',
};

/** 常规 tab：站点展示信息 */
export function getGeneralItems(): Array<FormItemConfig<SettingsField>> {
  return [
    {
      label: '站点显示名称',
      name: 'displayName',
      required: true,
      rules: getSettingsRules('displayName'),
      component: <Input maxLength={80} placeholder="请输入显示名称" />,
    },
    {
      label: '默认语言',
      name: 'defaultLanguage',
      component: (
        <Select
          options={[
            { label: '简体中文', value: 'zh-CN' },
            { label: 'English', value: 'en-US' },
          ]}
        />
      ),
    },
    {
      label: '支持邮箱',
      name: 'supportEmail',
      rules: getSettingsRules('supportEmail'),
      extra: '仅保存为管理员联系信息，不会用于发送邮件。',
      component: <Input placeholder="support@example.com" type="email" />,
    },
  ];
}

/** 访问策略 tab：注册、会话、BYOK 与维护模式 */
export function getAccessItems(): Array<FormItemConfig<SettingsField>> {
  return [
    {
      label: '允许新用户注册',
      name: 'allowRegistration',
      valuePropName: 'checked',
      component: <Switch checkedChildren="允许" unCheckedChildren="关闭" />,
    },
    {
      label: '会话策略',
      name: 'sessionPolicy',
      dividerBefore: true,
      component: (
        <Select
          options={[
            { label: '标准会话', value: 'standard' },
            { label: '严格会话', value: 'strict' },
          ]}
        />
      ),
    },
    {
      label: 'BYOK 允许来源',
      name: 'byokAllowedOrigins',
      dividerBefore: true,
      rules: getSettingsRules('byokAllowedOrigins'),
      extra:
        '每行一个精确 Origin，例如 https://example.com；留空会拒绝 BYOK 保存、删除和聊天请求。',
      component: <Input.TextArea autoSize={{ minRows: 3, maxRows: 6 }} maxLength={2000} />,
    },
    {
      label: '维护模式',
      name: 'maintenanceMode',
      dividerBefore: true,
      valuePropName: 'checked',
      component: <Switch checkedChildren="开启" unCheckedChildren="关闭" />,
    },
  ];
}
