'use client';

import { ApiOutlined, DeleteOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Select, Switch } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import {
  getAdminThirdPartyServiceOptions,
  updateAdminThirdPartyServiceOptions,
  type ThirdPartyServiceOption,
} from '@/api/modules/admin';
import styles from './page.module.scss';

const serviceColorOptions = [
  'default',
  'processing',
  'success',
  'warning',
  'error',
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

const initialValues: IAppForms.ThirdPartyServiceOptionsValues = {
  thirdPartyServiceOptions: [],
};

function createThirdPartyServiceOption(): ThirdPartyServiceOption {
  return { apiKeyUrl: '', color: 'processing', enabled: true, label: '', value: '' };
}

function normalizeThirdPartyServiceOptions(
  options?: ThirdPartyServiceOption[],
): ThirdPartyServiceOption[] {
  const selectedValues = new Set<string>();

  return (options ?? []).flatMap((option) => {
    const value = option.value.trim();
    const label = option.label.trim();
    const apiKeyUrl = option.apiKeyUrl?.trim();

    if (!value || !label || selectedValues.has(value)) {
      return [];
    }

    selectedValues.add(value);

    return [
      {
        value,
        label,
        color: option.color,
        ...(apiKeyUrl ? { apiKeyUrl } : {}),
        enabled: option.enabled,
      },
    ];
  });
}

function hasDuplicateServiceValue(
  options: ThirdPartyServiceOption[],
  value: string,
  index: number,
) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return false;
  }

  return options.some((option, optionIndex) => {
    return optionIndex !== index && option.value.trim() === trimmedValue;
  });
}

function isServiceValue(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,39}$/u.test(value);
}

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function ThirdPartyServiceSettingsPage() {
  const [form] = Form.useForm<IAppForms.ThirdPartyServiceOptionsValues>();
  const serviceOptions = Form.useWatch('thirdPartyServiceOptions', form) ?? [];
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    setLoading(true);

    try {
      const nextServiceOptions = await getAdminThirdPartyServiceOptions();

      form.setFieldsValue({ thirdPartyServiceOptions: nextServiceOptions });
    } catch {
      // 请求错误由 alova 全局提示处理。
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  async function onFinish(values: IAppForms.ThirdPartyServiceOptionsValues): Promise<void> {
    setSaving(true);

    try {
      const nextServiceOptions = await updateAdminThirdPartyServiceOptions(
        normalizeThirdPartyServiceOptions(values.thirdPartyServiceOptions),
      );
      form.setFieldsValue({ thirdPartyServiceOptions: nextServiceOptions });
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
            <ApiOutlined /> 第三方服务
          </h1>
          <p>
            配置用户第三方服务 API 凭据页面可选择的服务。删除或禁用后不会出现在新增凭据下拉选项中。
          </p>
        </div>
      </section>
      <Card className={styles.card} loading={loading} variant="borderless">
        <Form form={form} initialValues={initialValues} layout="vertical" onFinish={onFinish}>
          <Form.List name="thirdPartyServiceOptions">
            {(fields, { add, remove }) => {
              function onAddService(): void {
                add(createThirdPartyServiceOption());
              }

              return (
                <>
                  <div className={styles['service-toolbar']}>
                    <span>已配置 {fields.length} 个第三方服务</span>
                    <Button icon={<PlusOutlined />} type="dashed" onClick={onAddService}>
                      新增服务
                    </Button>
                  </div>
                  <div className={styles['service-list']}>
                    {fields.map((field) => {
                      const currentOption = serviceOptions[field.name];
                      const currentValue = currentOption?.value;

                      return (
                        <div className={styles['service-item']} key={field.key}>
                          <div className={styles['service-header']}>
                            <div className={styles['service-actions']}>
                              <Form.Item
                                name={[field.name, 'enabled']}
                                valuePropName="checked"
                                noStyle
                              >
                                <Switch checkedChildren="启用" unCheckedChildren="停用" />
                              </Form.Item>
                              <Button
                                aria-label={`删除 ${currentValue || 'service'}`}
                                danger
                                icon={<DeleteOutlined />}
                                type="text"
                                onClick={() => remove(field.name)}
                              />
                            </div>
                          </div>
                          <div className={styles['service-controls']}>
                            <Form.Item
                              label="服务标识"
                              name={[field.name, 'value']}
                              rules={[
                                {
                                  required: true,
                                  whitespace: true,
                                  message: '请输入服务标识',
                                },
                                {
                                  validator: (_, value?: string) => {
                                    if (!value || isServiceValue(value.trim())) {
                                      return Promise.resolve();
                                    }

                                    return Promise.reject(
                                      new Error('仅支持小写字母、数字和连字符'),
                                    );
                                  },
                                },
                                {
                                  validator: (_, value?: string) => {
                                    if (
                                      !value ||
                                      !hasDuplicateServiceValue(serviceOptions, value, field.name)
                                    ) {
                                      return Promise.resolve();
                                    }

                                    return Promise.reject(new Error('服务标识不能重复'));
                                  },
                                },
                              ]}
                            >
                              <Input maxLength={40} placeholder="tinypng" />
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
                              <Select options={serviceColorOptions} />
                            </Form.Item>
                            <Form.Item
                              label="API Key 链接"
                              name={[field.name, 'apiKeyUrl']}
                              rules={[
                                { max: 2048, message: 'API Key 链接不能超过 2048 个字符' },
                                {
                                  validator: (_, value?: string) => {
                                    const trimmedValue = value?.trim();

                                    if (!trimmedValue || isHttpsUrl(trimmedValue)) {
                                      return Promise.resolve();
                                    }

                                    return Promise.reject(new Error('请输入有效的 https 链接'));
                                  },
                                },
                              ]}
                            >
                              <Input
                                maxLength={2048}
                                placeholder="https://service.example.com/api-keys"
                              />
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
          <div className={styles.footer}>
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
