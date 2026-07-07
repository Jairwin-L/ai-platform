'use client';

import { Prompts, Welcome } from '@ant-design/x';
import { CHAT_PROMPT_ITEMS } from '../helpers';
import styles from '../page.module.scss';

interface WelcomePanelProps {
  activeModelId?: string;
  title: string;
  onPromptSelect: (value: string) => void;
}

export function WelcomePanel({ activeModelId, title, onPromptSelect }: WelcomePanelProps) {
  return (
    <div className={styles.welcome}>
      <Welcome
        description={
          activeModelId ? '选择提示词开始对话，或直接输入问题。' : '请先在 AI 设置中配置可用模型。'
        }
        title={title}
        variant="borderless"
      />
      <Prompts
        items={CHAT_PROMPT_ITEMS}
        wrap
        onItemClick={({ data }) => {
          if (typeof data.label === 'string') {
            onPromptSelect(data.label);
          }
        }}
      />
    </div>
  );
}
