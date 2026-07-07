'use client';

import { useRouter } from 'next/navigation';
import { Select } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import type { AiChatModelConfig } from '@/api/modules/ai-chat';
import styles from './page.module.scss';

interface DefaultModelConfigPanelProps {
  loading: boolean;
  models: AiChatModelConfig[];
  saving: boolean;
  onDefaultModelChange: (modelConfigId: string) => void;
}

function formatModelLabel(model: AiChatModelConfig): string {
  return `${model.name} · ${model.providerName} (${model.modelId})`;
}

export function DefaultModelConfigPanel({
  loading,
  models,
  saving,
  onDefaultModelChange,
}: DefaultModelConfigPanelProps) {
  const router = useRouter();
  const enabledModels = models.filter((model) => model.isEnabled);
  const defaultModelId = enabledModels.find((model) => model.isDefault)?.id;
  function onGoAIChatPage() {
    router.push('/ai/chat');
  }

  return (
    <section className={styles.panel}>
      <div className={styles.filters}>
        <div>
          <strong className={styles['section-title']}>
            <RobotOutlined /> 默认聊天模型
          </strong>
          <p className={styles['section-desc']}>
            用于{' '}
            <span className={styles['section-desc-link']} onClick={onGoAIChatPage}>
              /ai/chat
            </span>{' '}
            新建会话时默认选中的模型。
          </p>
        </div>
        <Select
          className={styles['default-model-select']}
          disabled={!enabledModels.length}
          loading={loading || saving}
          options={enabledModels.map((model) => ({
            label: formatModelLabel(model),
            value: model.id,
          }))}
          placeholder="请选择默认模型"
          value={defaultModelId}
          onChange={onDefaultModelChange}
        />
      </div>
    </section>
  );
}
