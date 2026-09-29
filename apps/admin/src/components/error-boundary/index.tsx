import { Button, Result } from 'antd';
import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router';
import { DASHBOARD_PATH } from '@/constants/app';
import AutoCenter from '../auto-center';

/** 路由级错误兜底：懒加载失败（发版后旧 chunk 失效）时引导刷新 */
export default function ErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();
  const subTitle = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : '页面加载失败，可能是版本已更新，请刷新后重试';

  const onReload = () => {
    window.location.reload();
  };

  const onBackHome = () => {
    void navigate(DASHBOARD_PATH, { replace: true });
  };

  return (
    <AutoCenter>
      <Result
        status="error"
        title="页面加载失败"
        subTitle={subTitle}
        extra={[
          <Button key="reload" type="primary" onClick={onReload}>
            刷新页面
          </Button>,
          <Button key="home" onClick={onBackHome}>
            返回工作台
          </Button>,
        ]}
      />
    </AutoCenter>
  );
}
