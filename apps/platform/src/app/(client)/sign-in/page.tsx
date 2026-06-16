'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Form, Input, Tabs, Typography } from 'antd';
import type { FormInstance } from 'antd';
import { requestVerificationCode, signInWithCode, signInWithPassword } from '@/services/auth';
import styles from './page.module.scss';

interface PasswordSignInValues {
  email: string;
  password: string;
}

interface CodeSignInValues {
  code: string;
  email: string;
}

async function requestCode(
  form: FormInstance,
  setLoading: (loading: boolean) => void,
): Promise<void> {
  try {
    const values = await form.validateFields(['email']);
    setLoading(true);
    await requestVerificationCode(values.email, 'sign-in');
  } catch {
    // Validation and request errors are surfaced by Ant Design/alova.
  } finally {
    setLoading(false);
  }
}

export default function SignInPage() {
  const router = useRouter();
  const [passwordForm] = Form.useForm<PasswordSignInValues>();
  const [codeForm] = Form.useForm<CodeSignInValues>();
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeRequestLoading, setCodeRequestLoading] = useState(false);

  async function onPasswordFinish(values: PasswordSignInValues): Promise<void> {
    setPasswordLoading(true);

    try {
      await signInWithPassword(values);
      router.push('/');
      router.refresh();
    } catch {
      // Request errors are surfaced by alova.
    } finally {
      setPasswordLoading(false);
    }
  }

  async function onCodeFinish(values: CodeSignInValues): Promise<void> {
    setCodeLoading(true);

    try {
      await signInWithCode(values);
      router.push('/');
      router.refresh();
    } catch {
      // Request errors are surfaced by alova.
    } finally {
      setCodeLoading(false);
    }
  }

  return (
    <main className={styles.authPage}>
      <section className={styles.authShell}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>N</div>
          <Typography.Title level={2}>登录账号</Typography.Title>
        </div>

        <div className={styles.panel}>
          <Tabs
            centered
            items={[
              {
                key: 'password',
                label: '密码登录',
                children: (
                  <Form
                    className={styles.form}
                    form={passwordForm}
                    layout="vertical"
                    onFinish={onPasswordFinish}
                  >
                    <Form.Item
                      label="邮箱"
                      name="email"
                      rules={[
                        { required: true, message: '请输入邮箱' },
                        { type: 'email', message: '请输入有效邮箱' },
                      ]}
                    >
                      <Input autoComplete="email" placeholder="name@example.com" />
                    </Form.Item>
                    <Form.Item
                      label="密码"
                      name="password"
                      rules={[
                        { required: true, message: '请输入密码' },
                        { min: 8, message: '密码至少 8 位' },
                      ]}
                    >
                      <Input.Password autoComplete="current-password" placeholder="请输入密码" />
                    </Form.Item>
                    <Button
                      className={styles.submit}
                      htmlType="submit"
                      loading={passwordLoading}
                      type="primary"
                    >
                      登录
                    </Button>
                  </Form>
                ),
              },
              {
                key: 'code',
                label: '验证码登录',
                children: (
                  <Form
                    className={styles.form}
                    form={codeForm}
                    layout="vertical"
                    onFinish={onCodeFinish}
                  >
                    <Form.Item
                      label="邮箱"
                      name="email"
                      rules={[
                        { required: true, message: '请输入邮箱' },
                        { type: 'email', message: '请输入有效邮箱' },
                      ]}
                    >
                      <Input autoComplete="email" placeholder="name@example.com" />
                    </Form.Item>
                    <div className={styles.codeRow}>
                      <Form.Item
                        label="验证码"
                        name="code"
                        rules={[
                          { required: true, message: '请输入验证码' },
                          { len: 6, message: '验证码为 6 位数字' },
                        ]}
                      >
                        <Input autoComplete="one-time-code" placeholder="6 位验证码" />
                      </Form.Item>
                      <Button
                        loading={codeRequestLoading}
                        onClick={() => requestCode(codeForm, setCodeRequestLoading)}
                      >
                        获取验证码
                      </Button>
                    </div>
                    <Button
                      className={styles.submit}
                      htmlType="submit"
                      loading={codeLoading}
                      type="primary"
                    >
                      登录
                    </Button>
                  </Form>
                ),
              },
            ]}
          />
        </div>

        <p className={styles.switchLink}>
          还没有账号？<Link href="/sign-up">注册账号</Link>
        </p>
      </section>
    </main>
  );
}
