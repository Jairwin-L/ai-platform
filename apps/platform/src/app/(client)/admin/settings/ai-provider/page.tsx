'use client';

import { DeleteOutlined, PlusOutlined, RobotOutlined, SaveOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Select, Switch } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import {
  getAdminAiProviderOptions,
  updateAdminAiProviderOptions,
  type AiProviderOption,
} from '@/api/modules/admin';
import styles from '../../resource-page.module.scss';
import pageStyles from './page.module.scss';

type ProviderOptionsValues = IAppForms.ProviderOptionsValues;

const providerColorOptions = [
  'blue',
  'cyan',
  'geekblue',
  'gold',
  'green',
  'lime',
  'magenta',
  'orange',
  'purple',
  'red',
  'volcano',
].map((color) => ({ label: color, value: color }));

const initialValues: ProviderOptionsValues = {
  aiProviderOptions: [],
};

function createAiProviderOption(): AiProviderOption {
  return { color: 'blue', enabled: true, label: '', value: '' };
}

function normalizeAiProviderOptions(options?: AiProviderOption[]): AiProviderOption[] {
  const selectedValues = new Set<string>();

  return (options ?? []).flatMap((option) => {
    const value = option.value.trim();
    const label = option.label.trim();

    if (!value || !label || selectedValues.has(value)) {
      return [];
    }

    selectedValues.add(value);

    return [
      {
        value,
        label,
        color: option.color,
        enabled: option.enabled,
      },
    ];
  });
}

function hasDuplicateProviderValue(options: AiProviderOption[], value: string, index: number) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return false;
  }

  return options.some((option, optionIndex) => {
    return optionIndex !== index && option.value.trim() === trimmedValue;
  });
}

export default function AiProviderSettingsPage() {
  const [form] = Form.useForm<ProviderOptionsValues>();
  const aiProviderOptions = Form.useWatch('aiProviderOptions', form) ?? [];
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    setLoading(true);

    try {
      const nextProviderOptions = await getAdminAiProviderOptions();

      form.setFieldsValue({ aiProviderOptions: nextProviderOptions });
    } catch {
      // 请求错误由 alova 全局提示处理。
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  async function onFinish(values: ProviderOptionsValues): Promise<void> {
    setSaving(true);

    try {
      const nextProviderOptions = await updateAdminAiProviderOptions(
        normalizeAiProviderOptions(values.aiProviderOptions),
      );
      form.setFieldsValue({ aiProviderOptions: nextProviderOptions });
    } catch {
      // 请求错误由 alova 全局提示处理。
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.heading}>
        <div>
          <h1>
            <RobotOutlined /> AI Provider
          </h1>
          <p>配置用户 AI 密钥页面可选择的 Provider。删除或禁用后不会出现在新增密钥下拉选项中。</p>
        </div>
      </section>
      <Card className={pageStyles.card} loading={loading} variant="borderless">
        <Form form={form} initialValues={initialValues} layout="vertical" onFinish={onFinish}>
          <Form.List name="aiProviderOptions">
            {(fields, { add, remove }) => {
              function onAddProvider(): void {
                add(createAiProviderOption());
              }

              return (
                <>
                  <div className={pageStyles['provider-toolbar']}>
                    <span>已配置 {fields.length} 个 Provider</span>
                    <Button icon={<PlusOutlined />} type="dashed" onClick={onAddProvider}>
                      新增 Provider
                    </Button>
                  </div>
                  <div className={pageStyles['provider-list']}>
                    {fields.map((field) => {
                      const currentOption = aiProviderOptions[field.name];
                      const currentValue = currentOption?.value;

                      return (
                        <div className={pageStyles['provider-item']} key={field.key}>
                          <div className={pageStyles['provider-header']}>
                            <div className={pageStyles['provider-actions']}>
                              <Form.Item
                                name={[field.name, 'enabled']}
                                valuePropName="checked"
                                noStyle
                              >
                                <Switch checkedChildren="启用" unCheckedChildren="停用" />
                              </Form.Item>
                              <Button
                                aria-label={`删除 ${currentValue || 'provider'}`}
                                danger
                                icon={<DeleteOutlined />}
                                type="text"
                                onClick={() => remove(field.name)}
                              />
                            </div>
                          </div>
                          <div className={pageStyles['provider-controls']}>
                            <Form.Item
                              label="Provider 标识"
                              name={[field.name, 'value']}
                              rules={[
                                {
                                  required: true,
                                  whitespace: true,
                                  message: '请输入 Provider 标识',
                                },
                                {
                                  validator: (_, value?: string) => {
                                    if (
                                      !value ||
                                      !hasDuplicateProviderValue(
                                        aiProviderOptions,
                                        value,
                                        field.name,
                                      )
                                    ) {
                                      return Promise.resolve();
                                    }

                                    return Promise.reject(new Error('Provider 标识不能重复'));
                                  },
                                },
                              ]}
                            >
                              <Input maxLength={40} placeholder="openai" />
                            </Form.Item>
                            <Form.Item
                              label="展示名称"
                              name={[field.name, 'label']}
                              rules={[
                                {
                                  required: true,
                                  whitespace: true,
                                  message: '请输入展示名称',
                                },
                              ]}
                            >
                              <Input maxLength={40} placeholder="展示名称" />
                            </Form.Item>
                            <Form.Item
                              label="标签颜色"
                              name={[field.name, 'color']}
                              rules={[{ required: true, message: '请选择标签颜色' }]}
                            >
                              <Select options={providerColorOptions} />
                            </Form.Item>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            }}
          </Form.List>
          <div className={pageStyles.footer}>
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
