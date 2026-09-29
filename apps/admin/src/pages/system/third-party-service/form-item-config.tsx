import { Input, Switch } from 'antd';
import type { FormItemConfig } from '@/components/form-items';
import { getServiceRules, type ServiceFormValues } from './schemas';

export const defaultValues: ServiceFormValues = {
  value: '',
  label: '',
  apiKeyUrl: '',
  enabled: true,
};

/** 第三方服务表单的字段配置，新建与编辑共用一份 */
export function getFormItems(): Array<FormItemConfig<keyof ServiceFormValues>> {
  return [
    {
      label: '服务标识',
      name: 'value',
      required: true,
      rules: getServiceRules('value'),
      component: <Input maxLength={40} placeholder="tinypng" />,
    },
    {
      label: '展示名称',
      name: 'label',
      required: true,
      rules: getServiceRules('label'),
      component: <Input maxLength={40} placeholder="TinyPNG" />,
    },
    {
      label: 'API Key 链接',
      name: 'apiKeyUrl',
      full: true,
      rules: getServiceRules('apiKeyUrl'),
      component: <Input maxLength={2048} placeholder="https://service.example.com/api-keys" />,
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
