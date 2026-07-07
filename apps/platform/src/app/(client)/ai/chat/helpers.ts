type ChatRouteParams = Record<string, string | string[] | undefined> | null;

const chatPrompts = ['帮我总结一段文本', '解释一段代码', '生成一个接口设计方案', '优化一段 SQL'];

export const CHAT_PROMPT_ITEMS = chatPrompts.map((prompt) => ({ key: prompt, label: prompt }));

export function getRouteConversationId(params: ChatRouteParams): string | null {
  const value = params?.id;

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return typeof value === 'string' ? value : null;
}

export function getChatConversationPath(conversationId: string): string {
  return `/ai/chat/${encodeURIComponent(conversationId)}`;
}

export function parseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
