'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button, Form, Input, Typography } from 'antd';
import type { FormInstance } from 'antd';
import { APP_BLACK_LOGO, APP_NAME, VERIFICATION_CODE_TTL_SECONDS } from '@/constants';
import { requestVerificationCode, signUp } from '@/api/modules/auth';
import styles from './page.module.scss';

type SignUpValues = IAppForms.SignUpValues;

async function requestCode(
  form: FormInstance,
  setCountdown: (seconds: number) => void,
  setLoading: (loading: boolean) => void,
): Promise<void> {
  try {
    const values = await form.validateFields(['email']);
    setLoading(true);
    await requestVerificationCode(values.email, 'sign-up');
    setCountdown(VERIFICATION_CODE_TTL_SECONDS);
  } catch {
    // Validation and request errors are surfaced by Ant Design/alova.
  } finally {
    setLoading(false);
  }
}

export default function SignUpPage() {
  const router = useRouter();
  const [form] = Form.useForm<SignUpValues>();
  const [submitLoading, setSubmitLoading] = useState(false);
  const [codeCountdown, setCodeCountdown] = useState(0);
  const [codeLoading, setCodeLoading] = useState(false);

  useEffect(() => {
    if (codeCountdown <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCodeCountdown((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [codeCountdown]);

  async function onFinish(values: SignUpValues): Promise<void> {
    setSubmitLoading(true);
    try {
      await signUp(values);
      router.push('/sign-in');
      router.refresh();
    } catch {
      // Request errors are surfaced by alova.
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <main className={styles['auth-page']}>
      <section className={styles['auth-shell']}>
        <div className={styles.brand}>
          <img alt={APP_NAME} className={styles['brand-logo']} src={APP_BLACK_LOGO} />
          <Typography.Title level={2}>注册账号</Typography.Title>
        </div>

        <div className={styles.panel}>
          <Form className={styles.form} form={form} layout="vertical" onFinish={onFinish}>
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
                { max: 128, message: '密码不能超过 128 位' },
              ]}
            >
              <Input.Password autoComplete="new-password" placeholder="至少 8 位密码" />
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
                loading={codeLoading}
                onClick={() => requestCode(form, setCodeCountdown, setCodeLoading)}
              >
                {codeCountdown > 0 ? `${codeCountdown} 秒后重发` : '获取验证码'}
              </Button>
            </div>
            <Button
              className={styles.submit}
              htmlType="submit"
              loading={submitLoading}
              type="primary"
            >
              注册
            </Button>
          </Form>
        </div>

        <p className={styles['switch-link']}>
          已有账号？<Link href="/sign-in">返回登录</Link>
        </p>
      </section>
    </main>
  );
}
