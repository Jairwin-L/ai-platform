'use client';

import { RedoOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import { XMarkdown } from '@ant-design/x-markdown';
import type { AiChatMessage } from '@/api/modules/ai-chat';
import styles from './page.module.scss';

interface ChatMessageProps {
  index: number;
  message: AiChatMessage;
  messages: AiChatMessage[];
  onRegenerate: (content: string) => void;
}

function getMessageStatusText(status: AiChatMessage['status']): string {
  if (status === 'STOPPED') {
    return '已停止生成';
  }

  if (status === 'ERROR') {
    return '生成失败';
  }

  return '';
}

export function ChatMessage({ index, message, messages, onRegenerate }: ChatMessageProps) {
  return (
    <article className={`${styles.message} ${styles[message.role.toLowerCase()]}`}>
      <div className={styles['message-content']}>
        {message.role === 'ASSISTANT' ? (
          <XMarkdown content={message.content || '正在思考...'} />
        ) : (
          <p>{message.content}</p>
        )}
      </div>
      <div className={styles['message-actions']}>
        <span>{getMessageStatusText(message.status)}</span>
        <Tooltip title="复制">
          <Button
            size="small"
            type="text"
            onClick={() => navigator.clipboard.writeText(message.content)}
          >
            复制
          </Button>
        </Tooltip>
        {message.role === 'ASSISTANT' ? (
          <Button
            icon={<RedoOutlined />}
            size="small"
            type="text"
            onClick={() => {
              const source = [...messages]
                .slice(0, index)
                .reverse()
                .find((messageItem) => messageItem.role === 'USER');

              if (source) {
                onRegenerate(source.content);
              }
            }}
          >
            重新生成
          </Button>
        ) : null}
      </div>
    </article>
  );
}
