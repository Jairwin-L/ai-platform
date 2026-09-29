import { Button, Result } from 'antd';
import AutoCenter from '../auto-center';

interface ExceptionProps {
  text?: string;
  /** 弹窗等高度受限的容器内使用：不做 60vh 垂直居中 */
  compact?: boolean;
  onClick: () => unknown;
}

/** 数据加载失败时的通用异常页：具体原因已由全局响应拦截器提示，这里只提供重试入口 */
export default function Exception({
  text = '系统繁忙，请稍后重试',
  compact = false,
  onClick,
}: ExceptionProps) {
  // void 用于显式丢弃可能返回的 Promise
  const onRetry = () => {
    void onClick();
  };

  const result = (
    <Result
      status="500"
      title={text}
      extra={
        <Button type="primary" onClick={onRetry}>
          重试
        </Button>
      }
    />
  );

  return compact ? result : <AutoCenter>{result}</AutoCenter>;
}
