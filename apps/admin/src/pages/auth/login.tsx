import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button, Card, Form, Input, Typography } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { adminLogin } from '@/api/methods/auth';
import { ApiError } from '@/api/request';
import { DASHBOARD_PATH, LOGIN_PATH, SITE_LOGO_URL, SITE_NAME, VITE_ENV } from '@/constants';
import { useAuthStore } from '@/stores/auth';
import { loginFormSchema, type LoginFormValues } from './schemas';
import css from './login.module.scss';

/** 只允许站内相对路径作为登录后的跳转目标，防止开放重定向 */
function getSafeRedirect(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith(LOGIN_PATH)) {
    return DASHBOARD_PATH;
  }
  return value;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentUser = useAuthStore((state) => state.currentUser);
  const fetchCurrentUser = useAuthStore((state) => state.fetchCurrentUser);
  const [form] = Form.useForm<LoginFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 已有有效会话时直接放行：登录成功后路由表会按新账号的菜单重建，重建后仍停在登录页，要靠这里跳走
  useEffect(() => {
    if (currentUser) {
      void navigate(getSafeRedirect(searchParams.get('redirectUrl')), { replace: true });
    }
  }, [currentUser, navigate, searchParams]);

  const onFinish = async (values: LoginFormValues) => {
    const parsed = loginFormSchema.safeParse(values);
    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? '请检查登录信息');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    try {
      await adminLogin(parsed.data);
      const account = await fetchCurrentUser();
      // 登录成功却拿不到账号，多半是跨域 Cookie 没写进浏览器（CORS / SameSite 配置问题）
      if (!account) {
        setErrorMessage('登录状态未生效，请检查管理后台与接口服务的域名配置');
      }
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : '登录失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={css['login-page']}>
      <Card className={css['login-card']} variant="borderless">
        <div className={css['login-brand']}>
          <img src={SITE_LOGO_URL} alt="logo" className={css['login-logo']} />
          <Typography.Title level={3}>{VITE_ENV.VITE_APP_TITLE || SITE_NAME}</Typography.Title>
        </div>
        <Form form={form} layout="vertical" requiredMark={false} onFinish={onFinish}>
          <Form.Item
            label="账号"
            name="account"
            rules={[{ required: true, whitespace: true, message: '请输入账号' }]}
          >
            <Input prefix={<UserOutlined />} autoComplete="username" placeholder="请输入账号" />
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
          </Form.Item>
          {errorMessage ? <p className={css['login-error']}>{errorMessage}</p> : null}
          <Button block type="primary" htmlType="submit" loading={submitting}>
            登录
          </Button>
        </Form>
      </Card>
    </main>
  );
}
