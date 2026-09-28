import { useNavigate } from 'react-router';
import { Button, Result } from 'antd';
import { DASHBOARD_PATH } from '@/constants/app';

export default function NotFoundPage() {
  const navigate = useNavigate();

  const onBackHome = () => {
    void navigate(DASHBOARD_PATH, { replace: true });
  };

  return (
    <Result
      status="404"
      title="页面不存在"
      subTitle="访问的页面不存在或已被移除"
      extra={
        <Button type="primary" onClick={onBackHome}>
          返回工作台
        </Button>
      }
    />
  );
}
