'use client';

import {
  DeleteOutlined,
  EditOutlined,
  MenuOutlined,
  MoreOutlined,
  RedoOutlined,
} from '@ant-design/icons';
import { App, Button, Drawer, Dropdown, Input, Modal, Select, Skeleton, Tooltip } from 'antd';
import { Prompts, Sender, Welcome } from '@ant-design/x';
import { XMarkdown } from '@ant-design/x-markdown';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  deleteAiConversation,
  getAiConversationMessages,
  getAiConversations,
  getAiModelConfigs,
  parseClientSse,
  stopAiChat,
  updateAiConversation,
  type AiChatConversation,
  type AiChatMessage,
  type AiChatModelConfig,
} from '@/api/modules/ai-chat';
import { ConversationSidebar } from './conversation-sidebar';
import styles from './ai-chat-screen.module.scss';

const prompts = ['帮我总结一段文本', '解释一段代码', '生成一个接口设计方案', '优化一段 SQL'];
const promptItems = prompts.map((prompt) => ({ key: prompt, label: prompt }));

function parseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
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

export function AiChatScreen() {
  const { message } = App.useApp();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const shouldStickRef = useRef(true);
  const [conversations, setConversations] = useState<AiChatConversation[]>([]);
  const [models, setModels] = useState<AiChatModelConfig[]>([]);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeModelId, setActiveModelId] = useState<string | undefined>();
  const [input, setInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const activeConversation = conversations.find((item) => item.id === activeConversationId) ?? null;
  const modelOptions = models
    .filter((item) => item.isEnabled)
    .map((item) => ({
      value: item.id,
      label: `${item.name} · ${item.providerName} (${item.modelId})`,
    }));

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const container = scrollRef.current;

      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    });
  }, []);

  const loadBaseData = useCallback(async () => {
    setLoading(true);
    const [conversationResult, modelResult] = await Promise.allSettled([
      getAiConversations({ keyword, pageSize: 80 }),
      getAiModelConfigs(),
    ]);

    if (conversationResult.status === 'fulfilled') {
      setConversations(conversationResult.value.list);
    }

    if (modelResult.status === 'fulfilled') {
      setModels(modelResult.value);
      setActiveModelId(
        (current) => current ?? modelResult.value.find((item) => item.isDefault)?.id,
      );
    }

    setLoading(false);
  }, [keyword]);

  useEffect(() => {
    loadBaseData().catch(() => undefined);
  }, [loadBaseData]);

  useEffect(() => {
    const stored = localStorage.getItem('ai-chat-sidebar-collapsed');

    setSidebarCollapsed(stored === '1');
  }, []);

  async function loadMessages(conversationId: string): Promise<void> {
    setMessagesLoading(true);

    try {
      const result = await getAiConversationMessages(conversationId);

      setMessages(result.messages);
      setActiveConversationId(conversationId);
      setActiveModelId(result.conversation.modelConfigId ?? undefined);
      shouldStickRef.current = true;
      scrollToBottom();
    } catch {
      setMessages([]);
    } finally {
      setMessagesLoading(false);
      setDrawerOpen(false);
    }
  }

  function toggleSidebar(): void {
    const nextCollapsed = !sidebarCollapsed;

    setSidebarCollapsed(nextCollapsed);
    localStorage.setItem('ai-chat-sidebar-collapsed', nextCollapsed ? '1' : '0');
  }

  function updateAssistantMessage(
    id: string,
    updater: (message: AiChatMessage) => AiChatMessage,
  ): void {
    setMessages((current) => current.map((item) => (item.id === id ? updater(item) : item)));

    if (shouldStickRef.current) {
      scrollToBottom();
    }
  }

  async function sendMessage(content: string): Promise<void> {
    const trimmed = content.trim();

    if (!trimmed || streaming) {
      return;
    }

    const controller = new AbortController();
    const tempUserId = `temp-user-${Date.now()}`;
    const tempAssistantId = `temp-assistant-${Date.now()}`;

    abortRef.current = controller;
    setStreaming(true);
    setInput('');
    setMessages((current) => [
      ...current,
      {
        id: tempUserId,
        role: 'USER',
        content: trimmed,
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
      },
      {
        id: tempAssistantId,
        role: 'ASSISTANT',
        content: '',
        status: 'STREAMING',
        createdAt: new Date().toISOString(),
      },
    ]);
    shouldStickRef.current = true;
    scrollToBottom();

    let assistantMessageId = tempAssistantId;
    let conversationId = activeConversationId ?? undefined;

    try {
      const response = await fetch('/api/ai/chat/stream', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          modelConfigId: activeModelId,
          content: trimmed,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error('发送失败');
      }

      for await (const event of parseClientSse(response.body)) {
        if (event.event === 'meta') {
          const meta = parseJson<{
            conversationId: string;
            userMessageId: string;
            assistantMessageId: string;
          }>(event.data);

          if (meta) {
            conversationId = meta.conversationId;
            assistantMessageId = meta.assistantMessageId;
            setActiveConversationId(meta.conversationId);
            setMessages((current) =>
              current.map((item) => {
                if (item.id === tempUserId) return { ...item, id: meta.userMessageId };
                if (item.id === tempAssistantId) return { ...item, id: meta.assistantMessageId };
                return item;
              }),
            );
          }
        }

        if (event.event === 'delta') {
          const payload = parseJson<{ delta: string }>(event.data);

          if (payload) {
            updateAssistantMessage(assistantMessageId, (item) => ({
              ...item,
              content: item.content + payload.delta,
            }));
          }
        }

        if (event.event === 'usage') {
          const usage = parseJson<unknown>(event.data);

          updateAssistantMessage(assistantMessageId, (item) => ({ ...item, usage }));
        }

        if (event.event === 'error') {
          const errorPayload = parseJson<{ message?: string }>(event.data);

          updateAssistantMessage(assistantMessageId, (item) => ({ ...item, status: 'ERROR' }));
          message.error(errorPayload?.message ?? '生成失败');
        }
      }

      updateAssistantMessage(assistantMessageId, (item) => ({ ...item, status: 'COMPLETED' }));
      await loadBaseData();
    } catch (error) {
      const aborted = error instanceof Error && error.name === 'AbortError';

      updateAssistantMessage(assistantMessageId, (item) => ({
        ...item,
        status: aborted ? 'STOPPED' : 'ERROR',
      }));

      if (aborted && conversationId) {
        await stopAiChat({ conversationId, assistantMessageId }).catch(() => undefined);
      } else if (!aborted) {
        message.error(error instanceof Error ? error.message : '生成失败');
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function stopStreaming(): void {
    abortRef.current?.abort();
  }

  async function changeModel(modelConfigId: string): Promise<void> {
    setActiveModelId(modelConfigId);

    if (!activeConversationId) {
      return;
    }

    try {
      await updateAiConversation(activeConversationId, { modelConfigId });
      await loadBaseData();
    } catch {
      // 请求错误由 alova 全局提示处理。
    }
  }

  async function renameConversation(): Promise<void> {
    if (!activeConversationId || !renameValue.trim()) {
      return;
    }

    await updateAiConversation(activeConversationId, { title: renameValue.trim() });
    setRenameOpen(false);
    await loadBaseData();
  }

  async function removeConversation(id: string): Promise<void> {
    await deleteAiConversation(id);

    if (activeConversationId === id) {
      setActiveConversationId(null);
      setMessages([]);
    }

    await loadBaseData();
  }

  function handleScroll(): void {
    const container = scrollRef.current;

    if (!container) return;

    shouldStickRef.current =
      container.scrollHeight - container.scrollTop - container.clientHeight < 80;
  }

  const sidebar = (
    <ConversationSidebar
      activeConversationId={activeConversationId}
      conversations={conversations}
      keyword={keyword}
      loading={loading}
      sidebarCollapsed={sidebarCollapsed}
      onCreateConversation={() => {
        setActiveConversationId(null);
        setMessages([]);
      }}
      onKeywordChange={setKeyword}
      onLoadConversation={loadMessages}
      onToggleSidebar={toggleSidebar}
    />
  );

  return (
    <main className={styles.page}>
      {!sidebarCollapsed ? (
        sidebar
      ) : (
        <Button
          className={styles['expand-button']}
          icon={<MenuOutlined />}
          onClick={toggleSidebar}
        />
      )}
      <Drawer open={drawerOpen} placement="left" size={300} onClose={() => setDrawerOpen(false)}>
        {sidebar}
      </Drawer>
      <section className={styles.chat}>
        <header className={styles.toolbar}>
          <Button
            className={styles['mobile-menu']}
            icon={<MenuOutlined />}
            type="text"
            onClick={() => setDrawerOpen(true)}
          />
          <button
            className={styles.title}
            type="button"
            onClick={() => {
              setRenameValue(activeConversation?.title ?? '新建对话');
              setRenameOpen(true);
            }}
          >
            {activeConversation?.title ?? '新建对话'}
          </button>
          <div className={styles['toolbar-actions']}>
            <Select
              className={styles['model-select']}
              disabled={streaming}
              options={modelOptions}
              placeholder="选择模型"
              value={activeModelId}
              onChange={changeModel}
            />
            <Dropdown
              menu={{
                items: [
                  { key: 'rename', icon: <EditOutlined />, label: '重命名' },
                  { key: 'delete', danger: true, icon: <DeleteOutlined />, label: '删除会话' },
                ],
                onClick: ({ key }) => {
                  if (key === 'rename') {
                    setRenameValue(activeConversation?.title ?? '新建对话');
                    setRenameOpen(true);
                  }
                  if (key === 'delete' && activeConversationId) {
                    Modal.confirm({
                      title: '删除当前会话吗？',
                      okText: '删除',
                      okButtonProps: { danger: true },
                      cancelText: '取消',
                      onOk: () => removeConversation(activeConversationId),
                    });
                  }
                },
              }}
            >
              <Button icon={<MoreOutlined />} type="text" />
            </Dropdown>
          </div>
        </header>
        <div ref={scrollRef} className={styles.messages} onScroll={handleScroll}>
          {messagesLoading ? <Skeleton active paragraph={{ rows: 6 }} /> : null}
          {!messagesLoading && messages.length === 0 ? (
            <div className={styles.welcome}>
              <Welcome
                description={
                  activeModelId
                    ? '选择提示词开始对话，或直接输入问题。'
                    : '请先在 AI 设置中配置可用模型。'
                }
                title="今天想聊什么？"
                variant="borderless"
              />
              <Prompts
                items={promptItems}
                wrap
                onItemClick={({ data }) => {
                  if (typeof data.label === 'string') {
                    setInput(data.label);
                  }
                }}
              />
            </div>
          ) : null}
          {messages.map((item, index) => (
            <article
              key={item.id}
              className={`${styles.message} ${styles[item.role.toLowerCase()]}`}
            >
              <div className={styles['message-content']}>
                {item.role === 'ASSISTANT' ? (
                  <XMarkdown content={item.content || '正在思考...'} />
                ) : (
                  <p>{item.content}</p>
                )}
              </div>
              <div className={styles['message-actions']}>
                <span>{getMessageStatusText(item.status)}</span>
                <Tooltip title="复制">
                  <Button
                    size="small"
                    type="text"
                    onClick={() => navigator.clipboard.writeText(item.content)}
                  >
                    复制
                  </Button>
                </Tooltip>
                {item.role === 'ASSISTANT' ? (
                  <Button
                    icon={<RedoOutlined />}
                    size="small"
                    type="text"
                    onClick={() => {
                      const source = [...messages]
                        .slice(0, index)
                        .reverse()
                        .find((messageItem) => messageItem.role === 'USER');
                      if (source) sendMessage(source.content);
                    }}
                  >
                    重新生成
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
        <footer className={styles.sender}>
          <Sender
            autoSize={{ minRows: 1, maxRows: 8 }}
            className={styles['sender-box']}
            disabled={!activeModelId}
            loading={streaming}
            placeholder={
              activeModelId ? '输入消息，Enter 发送，Shift + Enter 换行' : '请先配置并选择模型'
            }
            value={input}
            onCancel={stopStreaming}
            onChange={setInput}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && streaming) {
                stopStreaming();
              }
            }}
            onSubmit={() => sendMessage(input)}
          />
          <p>AI 可能会产生错误，请核实重要信息。</p>
        </footer>
      </section>
      <Modal
        destroyOnHidden
        okText="保存"
        cancelText="取消"
        centered
        open={renameOpen}
        title="重命名会话"
        onCancel={() => setRenameOpen(false)}
        onOk={renameConversation}
      >
        <Input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} />
      </Modal>
    </main>
  );
}
