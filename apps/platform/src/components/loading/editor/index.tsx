import { Spin } from 'antd';
import styles from './index.module.scss';

export default function LoadingEditorPreview() {
  return (
    <div className={styles['simple-editor-loading']}>
      <Spin size="large" description="Loading Editor Preview..." />;
    </div>
  );
}
