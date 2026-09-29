import { useNavigate } from 'react-router';
import { Button, Result } from 'antd';
import { DASHBOARD_PATH } from '@/constants/app';
import AutoCenter from '@/components/auto-center';

export default function Page() {
  const navigate = useNavigate();

  const onBackHome = () => {
    void navigate(DASHBOARD_PATH, { replace: true });
  };

  return (
    <AutoCenter>
      <Result
        status="404"
        title="404"
        subTitle="页面不存在，或当前账号没有该页面的访问权限"
        extra={
          <Button type="primary" onClick={onBackHome}>
            返回工作台
          </Button>
        }
      />
    </AutoCenter>
  );
}
