'use client';

import { PlusOutlined } from '@ant-design/icons';
import { Button, Empty, Input, Skeleton } from 'antd';
import Link from 'next/link';
import type { AiChatConversation } from '@/api/modules/ai-chat';
import { APP_BLACK_LOGO, APP_NAME } from '@/constants';
import styles from '../page.module.scss';

interface ConversationSidebarProps {
  activeConversationId: string | null;
  conversations: AiChatConversation[];
  keyword: string;
  loading: boolean;
  onCreateConversation: () => void;
  onKeywordChange: (value: string) => void;
  onLoadConversation: (conversationId: string) => void;
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function groupConversations(conversations: AiChatConversation[]) {
  const now = Date.now();

  return [
    {
      title: '今天',
      items: conversations.filter(
        (item) => now - new Date(item.lastMessageAt).getTime() < 86400000,
      ),
    },
    {
      title: '最近 7 天',
      items: conversations.filter((item) => {
        const distance = now - new Date(item.lastMessageAt).getTime();

        return distance >= 86400000 && distance < 7 * 86400000;
      }),
    },
    {
      title: '更早',
      items: conversations.filter(
        (item) => now - new Date(item.lastMessageAt).getTime() >= 7 * 86400000,
      ),
    },
  ].filter((group) => group.items.length > 0);
}

export function ConversationSidebar({
  activeConversationId,
  conversations,
  keyword,
  loading,
  onCreateConversation,
  onKeywordChange,
  onLoadConversation,
}: ConversationSidebarProps) {
  const groupedConversations = groupConversations(conversations);

  return (
    <aside className={styles.sidebar}>
      <div className={styles['sidebar-header']}>
        <Link className={styles['sidebar-brand']} href="/">
          <img alt={APP_NAME} className={styles['sidebar-logo']} src={APP_BLACK_LOGO} />
          <span>{APP_NAME}</span>
        </Link>
        <div className={styles['sidebar-controls']}>
          <Input.Search
            allowClear
            className={styles['conversation-search']}
            placeholder="搜索会话"
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
          />
          <Button
            aria-label="新建聊天"
            icon={<PlusOutlined />}
            title="新建聊天"
            type="primary"
            onClick={onCreateConversation}
          />
        </div>
      </div>
      <div className={styles['conversation-list']}>
        {loading ? <Skeleton active paragraph={{ rows: 8 }} /> : null}
        {!loading && conversations.length === 0 ? (
          <Empty description="暂无会话" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : null}
        {groupedConversations.map((group) => (
          <section key={group.title} className={styles['conversation-group']}>
            <h2>{group.title}</h2>
            {group.items.map((item) => (
              <button
                key={item.id}
                className={`${styles['conversation-item']} ${item.id === activeConversationId ? styles.active : ''}`}
                type="button"
                onClick={() => onLoadConversation(item.id)}
              >
                <span>{item.title}</span>
                <small>{formatTime(item.lastMessageAt)}</small>
              </button>
            ))}
          </section>
        ))}
      </div>
    </aside>
  );
}
