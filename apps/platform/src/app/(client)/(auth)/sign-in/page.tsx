'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button, Form, Input, Tabs, Typography } from 'antd';
import type { FormInstance } from 'antd';
import { APP_BLACK_LOGO, APP_NAME, VERIFICATION_CODE_TTL_SECONDS } from '@/constants';
import { requestVerificationCode, signInWithCode, signInWithPassword } from '@/api/modules/auth';
import { useAuthSessionStore } from '@/stores/auth-session';
import styles from './page.module.scss';

type CodeSignInValues = IAppForms.CodeSignInValues;
type PasswordSignInValues = IAppForms.PasswordSignInValues;

async function requestCode(
  form: FormInstance,
  setCountdown: (seconds: number) => void,
  setLoading: (loading: boolean) => void,
): Promise<void> {
  try {
    const values = await form.validateFields(['email']);
    setLoading(true);
    await requestVerificationCode(values.email, 'sign-in');
    setCountdown(VERIFICATION_CODE_TTL_SECONDS);
  } catch {
    // Validation and request errors are surfaced by Ant Design/alova.
  } finally {
    setLoading(false);
  }
}

function getRedirectPath(): string {
  const redirectUrl = new URLSearchParams(window.location.search).get('redirectUrl');

  if (!redirectUrl || !redirectUrl.startsWith('/') || redirectUrl.startsWith('//')) {
    return '/';
  }

  try {
    const url = new URL(redirectUrl, window.location.origin);

    if (url.origin !== window.location.origin) {
      return '/';
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/';
  }
}

export default function SignInPage() {
  const router = useRouter();
  const setPayload = useAuthSessionStore((state) => state.setPayload);
  const [passwordForm] = Form.useForm<PasswordSignInValues>();
  const [codeForm] = Form.useForm<CodeSignInValues>();
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeCountdown, setCodeCountdown] = useState(0);
  const [codeRequestLoading, setCodeRequestLoading] = useState(false);

  useEffect(() => {
    if (codeCountdown <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCodeCountdown((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [codeCountdown]);

  async function onPasswordFinish(values: PasswordSignInValues): Promise<void> {
    setPasswordLoading(true);

    try {
      setPayload(await signInWithPassword(values));
      router.push(getRedirectPath());
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
      setPayload(await signInWithCode(values));
      router.push(getRedirectPath());
      router.refresh();
    } catch {
      // Request errors are surfaced by alova.
    } finally {
      setCodeLoading(false);
    }
  }

  return (
    <main className={styles['auth-page']}>
      <section className={styles['auth-shell']}>
        <div className={styles.brand}>
          <img alt={APP_NAME} className={styles['brand-logo']} src={APP_BLACK_LOGO} />
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
                    <div className={styles['code-row']}>
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
                        disabled={codeCountdown > 0}
                        loading={codeRequestLoading}
                        onClick={() =>
                          requestCode(codeForm, setCodeCountdown, setCodeRequestLoading)
                        }
                      >
                        {codeCountdown > 0 ? `${codeCountdown} 秒后重发` : '获取验证码'}
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

        <p className={styles['switch-link']}>
          还没有账号？<Link href="/sign-up">注册账号</Link>
        </p>
      </section>
    </main>
  );
}
