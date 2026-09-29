import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Alert, Button, Form, Input } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { adminLogin, fetchCurrentUser } from '@/api/methods/auth';
import { ApiError } from '@/api/request';
import { DASHBOARD_PATH, LOGIN_PATH, SITE_LOGO_DARK_URL, SITE_NAME, VITE_ENV } from '@/constants';
import { useAuthStore } from '@/stores/auth';
import { getLoginRules, loginFormSchema, type LoginFormValues } from './schemas';
import css from './login.module.scss';

/** 只接受站内相对路径，挡掉 `//evil.com` 这类协议相对地址的开放重定向 */
function getSafeRedirectPath(redirect: string | null): string {
  if (
    !redirect ||
    !redirect.startsWith('/') ||
    redirect.startsWith('//') ||
    redirect.startsWith(LOGIN_PATH)
  ) {
    return DASHBOARD_PATH;
  }
  return redirect;
}

export default function Page() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm<LoginFormValues>();
  const [loading, setLoading] = useState(false);
  // 登录接口走 silent，失败原因由页面自己展示，不经全局提示
  const [errorMessage, setErrorMessage] = useState('');
  const currentUser = useAuthStore((state) => state.currentUser);
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser);
  const appTitle = VITE_ENV.VITE_APP_TITLE || SITE_NAME;

  useEffect(() => {
    document.title = `登录 - ${appTitle}`;
  }, [appTitle]);

  // 已有有效会话时直接放行：登录成功后路由表会按新账号的菜单重建，重建后仍停在登录页，要靠这里跳走
  useEffect(() => {
    if (currentUser) {
      void navigate(getSafeRedirectPath(searchParams.get('redirectUrl')), { replace: true });
    }
  }, [currentUser, navigate, searchParams]);

  const onFinish = async (values: LoginFormValues) => {
    const parsed = loginFormSchema.safeParse(values);
    if (!parsed.success) return;

    setLoading(true);
    setErrorMessage('');
    try {
      // 不持有已启用角色的系统账号会被服务端直接拒绝（403），这里不再按角色码二次判断
      await adminLogin(parsed.data);
      // 登录接口只下发会话 Cookie，当前账号统一以 /auth/me 为准。
      // 这一步拿不到账号，通常是跨域会话 Cookie 没写进浏览器（CORS / SameSite / 域名配置）
      const account = await fetchCurrentUser()
        .then((response) => response.data ?? null)
        .catch(() => null);
      if (!account) {
        setErrorMessage('登录状态未生效，请检查管理后台与接口服务的域名配置');
        return;
      }
      setCurrentUser(account);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : '登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={css['login-page']}>
      <main className={css['login-content']}>
        <div className={css['login-header']}>
          <img src={SITE_LOGO_DARK_URL} alt="logo" className={css['logo-img']} />
          <h1>{appTitle}</h1>
        </div>
        <div className={css['login-main']}>
          {errorMessage ? (
            <Alert showIcon className={css['login-error']} title={errorMessage} type="error" />
          ) : null}
          <Form form={form} size="large" onFinish={onFinish}>
            <Form.Item name="account" required rules={getLoginRules('account')}>
              <Input autoComplete="username" placeholder="请输入账号" prefix={<UserOutlined />} />
            </Form.Item>
            <Form.Item name="password" required rules={getLoginRules('password')}>
              <Input.Password
                autoComplete="current-password"
                placeholder="请输入密码"
                prefix={<LockOutlined />}
              />
            </Form.Item>
            <Button block htmlType="submit" loading={loading} size="large" type="primary">
              登录
            </Button>
          </Form>
        </div>
      </main>
      <footer className={css['login-footer']}>
        © {new Date().getFullYear()} {appTitle}
      </footer>
    </div>
  );
}
