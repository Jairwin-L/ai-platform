import { Input, Select, Switch } from 'antd';
import type { FormItemConfig } from '@/components/form-items';
import { PROVIDER_PROTOCOL_OPTIONS } from './const';
import { getProviderRules, type ProviderFormValues } from './schemas';

export const defaultValues: ProviderFormValues = {
  value: '',
  label: '',
  apiKeyUrl: '',
  protocol: 'chat-completions',
  chatBaseUrl: '',
  models: [],
  enabled: true,
};

/** AI Provider 表单的字段配置，新建与编辑共用一份 */
export function getFormItems(): Array<FormItemConfig<keyof ProviderFormValues>> {
  return [
    {
      label: 'Provider 标识',
      name: 'value',
      required: true,
      rules: getProviderRules('value'),
      component: <Input maxLength={40} placeholder="provider_key" />,
    },
    {
      label: '展示名称',
      name: 'label',
      required: true,
      rules: getProviderRules('label'),
      component: <Input maxLength={40} placeholder="请输入展示名称" />,
    },
    {
      label: '协议',
      name: 'protocol',
      required: true,
      rules: getProviderRules('protocol'),
      component: <Select options={PROVIDER_PROTOCOL_OPTIONS} />,
    },
    {
      label: 'API Key 链接',
      name: 'apiKeyUrl',
      rules: getProviderRules('apiKeyUrl'),
      component: <Input maxLength={2048} placeholder="https://platform.example.com/api-keys" />,
    },
    {
      label: 'Chat Base URL',
      name: 'chatBaseUrl',
      full: true,
      required: true,
      rules: getProviderRules('chatBaseUrl'),
      component: (
        <Input maxLength={2048} placeholder="https://api.example.com/v1/chat/completions" />
      ),
    },
    {
      label: '模型',
      name: 'models',
      full: true,
      required: true,
      rules: getProviderRules('models'),
      component: (
        <Select
          mode="tags"
          open={false}
          placeholder="输入模型名称后回车"
          tokenSeparators={[',', '\n']}
        />
      ),
    },
    {
      label: '启用状态',
      name: 'enabled',
      full: true,
      valuePropName: 'checked',
      component: <Switch checkedChildren="启用" unCheckedChildren="停用" />,
    },
  ];
}
