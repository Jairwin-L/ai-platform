'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button, Form, Input, Typography } from 'antd';
import { VERIFICATION_CODE_TTL_SECONDS } from '@/constants';
import { requestResetPasswordCode, resetPassword } from '@/api/modules/auth';
import { useDebounced } from '@/hooks/use-debounced';
import { useAuthSessionStore } from '@/stores/auth-session';
import { passwordSchema, verificationCodeSchema } from '@/lib/auth/schemas';
import styles from './page.module.scss';

interface SafeParseSchema {
  safeParse(value: unknown): { success: boolean };
}

function createZodRule(schema: SafeParseSchema, getMessage: (value: unknown) => string) {
  return {
    validator(_: unknown, value: unknown): Promise<void> {
      if (schema.safeParse(value).success) {
        return Promise.resolve();
      }

      return Promise.reject(new Error(getMessage(value)));
    },
  };
}

const passwordRule = createZodRule(passwordSchema, (value) => {
  if (!value) {
    return '请输入新密码';
  }

  if (typeof value === 'string' && value.length > 128) {
    return '新密码不能超过 128 位';
  }

  return '新密码至少 8 位';
});

const codeRule = createZodRule(verificationCodeSchema, (value) => {
  return value ? '验证码为 6 位数字' : '请输入验证码';
});

async function requestCode(
  setCountdown: (seconds: number) => void,
  setLoading: (loading: boolean) => void,
): Promise<void> {
  try {
    setLoading(true);
    await requestResetPasswordCode();
    setCountdown(VERIFICATION_CODE_TTL_SECONDS);
  } catch {
    // Request errors are surfaced by alova.
  } finally {
    setLoading(false);
  }
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const clearSession = useAuthSessionStore((state) => state.clearSession);
  const [form] = Form.useForm<IAppForms.ResetPasswordValues>();
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

  async function onFinish(values: IAppForms.ResetPasswordValues): Promise<void> {
    setSubmitLoading(true);

    try {
      await resetPassword(values);
      clearSession();
      router.push('/sign-in');
      router.refresh();
    } catch {
      // Request errors are surfaced by alova.
    } finally {
      setSubmitLoading(false);
    }
  }
  function onSubmit() {
    form.submit();
  }
  const debouncedRequestCode = useDebounced(() => {
    requestCode(setCodeCountdown, setCodeLoading);
  }, 300);
  const debouncedSubmit = useDebounced(onSubmit, 300);

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <div className={styles.heading}>
          <div>
            <Typography.Title level={2}>重置密码</Typography.Title>
            <p>验证码将发送到当前账号绑定邮箱。</p>
          </div>
        </div>

        <Form className={styles.form} form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item label="新密码" name="password" rules={[passwordRule]}>
            <Input.Password autoComplete="new-password" placeholder="至少 8 位新密码" />
          </Form.Item>
          <div className={styles['code-row']}>
            <Form.Item label="验证码" name="code" rules={[codeRule]}>
              <Input autoComplete="one-time-code" placeholder="6 位验证码" />
            </Form.Item>
            <Button
              disabled={codeCountdown > 0}
              loading={codeLoading}
              onClick={debouncedRequestCode}
            >
              {codeCountdown > 0 ? `${codeCountdown} 秒后重发` : '获取验证码'}
            </Button>
          </div>
        </Form>
        <Button
          className={styles.submit}
          htmlType="submit"
          onClick={debouncedSubmit}
          loading={submitLoading}
          type="primary"
        >
          重置密码
        </Button>
      </section>
    </main>
  );
}
