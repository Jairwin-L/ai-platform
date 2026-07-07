import type { ChatMessageStatus, ChatRole } from '@/generated/prisma/client';

interface ContextMessage {
  content: string;
  role: ChatRole;
  status: ChatMessageStatus;
}

export function buildSystemPrompt(
  conversationPrompt?: string | null,
  modelPrompt?: string | null,
): string | undefined {
  return conversationPrompt?.trim() || modelPrompt?.trim() || undefined;
}

function toAdapterRole(role: ChatRole): 'assistant' | 'system' | 'tool' | 'user' {
  if (role === 'SYSTEM') return 'system';
  if (role === 'ASSISTANT') return 'assistant';
  if (role === 'TOOL') return 'tool';
  return 'user';
}

function isUsefulContextMessage(message: ContextMessage): boolean {
  if (!message.content.trim()) {
    return false;
  }

  if (message.status === 'ERROR' && !message.content.trim()) {
    return false;
  }

  if (message.role === 'ASSISTANT' && message.status === 'STREAMING') {
    return false;
  }

  return true;
}

export function buildChatContextMessages(
  messages: ContextMessage[],
  systemPrompt?: string,
): Array<{ role: 'assistant' | 'system' | 'tool' | 'user'; content: string }> {
  const contextMessages = messages
    .filter(isUsefulContextMessage)
    .slice(-20)
    .map((message) => ({
      role: toAdapterRole(message.role),
      content: message.content,
    }));

  if (!systemPrompt) {
    return contextMessages;
  }

  return [{ role: 'system', content: systemPrompt }, ...contextMessages];
}
