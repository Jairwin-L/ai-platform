'use client';

import {
  DeleteOutlined,
  EditOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { App, Button, Dropdown, Modal, Select, Skeleton, Tag } from 'antd';
import { Sender } from '@ant-design/x';
import { useParams, useRouter } from 'next/navigation';
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
import { AccountMenu } from '@/app/(client)/(site)/components/account-menu';
import { ChatMessage } from './message';
import { ConversationSidebar } from './sidebar';
import { RenameConversationModal } from './rename-conversation-modal';
import { WelcomePanel } from './welcome-panel';
import { useDebounced } from '@/hooks/use-debounced';
import { useAuthSessionStore } from '@/stores/auth-session';
import { getChatConversationPath, getRouteConversationId, parseJson } from '../helpers';
import styles from '../page.module.scss';

export function ChatShell() {
  const { message } = App.useApp();
  const params = useParams();
  const router = useRouter();
  const routeConversationId = getRouteConversationId(params);
  const userData = useAuthSessionStore((state) => state.payload?.user);
  const userNickName = userData?.nickName?.trim();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const shouldStickRef = useRef(true);
  const loadedConversationIdRef = useRef<string | null>(null);
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const activeConversation = conversations.find((item) => item.id === activeConversationId) ?? null;
  const canChangeModel = !routeConversationId && !activeConversationId;
  const welcomeTitle = `hi，${userNickName ? `${userNickName}，` : ''}今天想聊点什么？`;
  const modelOptions = models
    .filter((item) => item.isEnabled)
    .map((item) => ({
      value: item.id,
      label: (
        <span className={styles['model-option']}>
          <span>{`${item.name} · ${item.providerName} (${item.modelId})`}</span>
          {item.isDefault ? <Tag color="blue">默认</Tag> : null}
        </span>
      ),
    }));

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const container = scrollRef.current;

      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    });
  }, []);

  const fetchConversations = useCallback(async () => {
    setLoading(true);

    try {
      const result = await getAiConversations({ keyword, pageSize: 80 });

      setConversations(result.list);
    } finally {
      setLoading(false);
    }
  }, [keyword]);

  const fetchModelConfigs = useCallback(async () => {
    const result = await getAiModelConfigs();
    const enabledModels = result.filter((item) => item.isEnabled);
    const defaultModelId = enabledModels.find((item) => item.isDefault)?.id ?? enabledModels[0]?.id;

    setModels(result);
    setActiveModelId((current) => current ?? defaultModelId);
  }, []);

  useEffect(() => {
    fetchConversations().catch(() => undefined);
  }, [fetchConversations]);

  useEffect(() => {
    fetchModelConfigs().catch(() => undefined);
  }, [fetchModelConfigs]);

  useEffect(() => {
    const stored = localStorage.getItem('ai-chat-sidebar-collapsed');

    setSidebarCollapsed(stored === '1');
  }, []);

  const loadMessages = useCallback(
    async (conversationId: string): Promise<void> => {
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
      }
    },
    [scrollToBottom],
  );

  useEffect(() => {
    if (!routeConversationId) {
      loadedConversationIdRef.current = null;
      setActiveConversationId(null);
      setMessages([]);

      return;
    }

    if (loadedConversationIdRef.current === routeConversationId) {
      return;
    }

    loadedConversationIdRef.current = routeConversationId;
    loadMessages(routeConversationId).catch(() => {
      loadedConversationIdRef.current = null;
    });
  }, [loadMessages, routeConversationId]);

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
            loadedConversationIdRef.current = meta.conversationId;
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
      await fetchConversations();

      if (conversationId && routeConversationId !== conversationId) {
        router.replace(getChatConversationPath(conversationId));
      }
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

  function changeModel(modelConfigId: string): void {
    if (!canChangeModel) {
      return;
    }

    setActiveModelId(modelConfigId);
  }

  async function renameConversation(): Promise<void> {
    if (!activeConversationId || !renameValue.trim()) {
      return;
    }

    await updateAiConversation(activeConversationId, { title: renameValue.trim() });
    setRenameOpen(false);
    await fetchConversations();
  }

  async function removeConversation(id: string): Promise<void> {
    await deleteAiConversation(id);

    if (activeConversationId === id) {
      setActiveConversationId(null);
      setMessages([]);
      loadedConversationIdRef.current = null;

      if (routeConversationId === id) {
        router.replace('/ai/chat');
      }
    }

    await fetchConversations();
  }
  const debouncedSendMessage = useDebounced(sendMessage, 300);
  const debouncedStopStreaming = useDebounced(stopStreaming, 300);
  const debouncedRenameConversation = useDebounced(renameConversation, 300);
  const debouncedRemoveConversation = useDebounced(removeConversation, 300);

  function onMoreHeaderOperate({ key }: { key: string }): void {
    if (key === 'RENAME') {
      setRenameValue(activeConversation?.title ?? '新建对话');
      setRenameOpen(true);
    }
    if (key === 'DELETE' && activeConversationId) {
      Modal.confirm({
        title: '删除当前会话吗？',
        okText: '删除',
        centered: true,
        okButtonProps: { danger: true },
        cancelText: '取消',
        onOk: () => debouncedRemoveConversation(activeConversationId),
      });
    }
  }
  function handleScroll(): void {
    const container = scrollRef.current;

    if (!container) return;

    shouldStickRef.current =
      container.scrollHeight - container.scrollTop - container.clientHeight < 80;
  }
  function onCreateConversation(): void {
    loadedConversationIdRef.current = null;
    setActiveConversationId(null);
    setMessages([]);
    router.push('/ai/chat');
  }
  function onLoadConversation(conversationId: string): void {
    if (conversationId !== routeConversationId) {
      router.push(getChatConversationPath(conversationId));
    }
  }

  const sidebar = (
    <ConversationSidebar
      activeConversationId={activeConversationId}
      conversations={conversations}
      keyword={keyword}
      loading={loading}
      onCreateConversation={onCreateConversation}
      onKeywordChange={setKeyword}
      onLoadConversation={onLoadConversation}
    />
  );

  return (
    <>
      <main className={styles.page}>
        {!sidebarCollapsed ? sidebar : null}
        <section className={styles.chat}>
          <header className={styles.toolbar}>
            <div className={styles['toolbar-left-container']}>
              <Button
                aria-label={sidebarCollapsed ? '展开侧栏' : '收起侧栏'}
                className={styles['sidebar-toggle']}
                icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                title={sidebarCollapsed ? '展开侧栏' : '收起侧栏'}
                onClick={toggleSidebar}
              />
              <h1 className={styles.title}>{activeConversation?.title ?? '新建对话'}</h1>
              {activeConversationId ? (
                <Dropdown
                  trigger={['click']}
                  menu={{
                    items: [
                      { key: 'RENAME', icon: <EditOutlined />, label: '重命名' },
                      { key: 'DELETE', danger: true, icon: <DeleteOutlined />, label: '删除会话' },
                    ],
                    onClick: onMoreHeaderOperate,
                  }}
                >
                  <Button className={styles['more-button']} icon={<MoreOutlined />} type="text" />
                </Dropdown>
              ) : null}
            </div>
            <div className={styles['toolbar-actions']}>
              <Select
                className={styles['model-select']}
                disabled={streaming || !canChangeModel}
                options={modelOptions}
                placeholder="选择模型"
                value={activeModelId}
                onChange={changeModel}
              />
              <AccountMenu />
            </div>
          </header>
          <div ref={scrollRef} className={styles.messages} onScroll={handleScroll}>
            {messagesLoading ? <Skeleton active paragraph={{ rows: 6 }} /> : null}
            {!messagesLoading && messages.length === 0 ? (
              <WelcomePanel
                activeModelId={activeModelId}
                title={welcomeTitle}
                onPromptSelect={setInput}
              />
            ) : null}
            {messages.map((item, index) => (
              <ChatMessage
                key={item.id}
                index={index}
                message={item}
                messages={messages}
                onRegenerate={debouncedSendMessage}
              />
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
              onCancel={debouncedStopStreaming}
              onChange={setInput}
              onKeyDown={(event) => {
                if (event.key === 'Escape' && streaming) {
                  debouncedStopStreaming();
                }
              }}
              onSubmit={() => debouncedSendMessage(input)}
            />
            <p>AI 可能会产生错误，请核实重要信息。</p>
          </footer>
        </section>
      </main>
      <RenameConversationModal
        open={renameOpen}
        value={renameValue}
        onCancel={() => setRenameOpen(false)}
        onOk={debouncedRenameConversation}
        onValueChange={setRenameValue}
      />
    </>
  );
}
