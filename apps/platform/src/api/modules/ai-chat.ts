import { alovaDelete, alovaGet, alovaInstance, alovaPost } from '@/api/alova';

export type AiChatConversation = IApiAiChat.Conversation;
export type AiChatMessage = IApiAiChat.ChatMessage;
export type AiChatModelConfig = IApiAiChat.ModelConfig;
export type AiChatProviderConfig = IApiAiChat.ProviderConfig;
export type AiChatProviderKind = IApiAiChat.ProviderKind;

export async function getAiProviderConfigs(): Promise<AiChatProviderConfig[]> {
  return alovaGet<AiChatProviderConfig[]>('/ai/provider-configs');
}

export async function createAiProviderConfig(
  payload: Required<Pick<IApiAiChat.ProviderConfigPayload, 'apiKey' | 'name' | 'provider'>> &
    IApiAiChat.ProviderConfigPayload,
): Promise<AiChatProviderConfig> {
  return alovaPost<AiChatProviderConfig>('/ai/provider-configs', payload);
}

export async function updateAiProviderConfig(
  id: string,
  payload: IApiAiChat.ProviderConfigPayload,
): Promise<AiChatProviderConfig> {
  return alovaInstance.Patch<AiChatProviderConfig>(`/ai/provider-configs/${id}`, payload, {
    meta: { showSuccessMessage: true },
  });
}

export async function deleteAiProviderConfig(id: string): Promise<void> {
  await alovaDelete(`/ai/provider-configs/${id}`);
}

export async function verifyAiProviderConfig(id: string): Promise<{ ok: boolean; error?: string }> {
  return alovaPost<{ ok: boolean; error?: string }>(`/ai/provider-configs/${id}/verify`);
}

export async function getAiModelConfigs(): Promise<AiChatModelConfig[]> {
  return alovaGet<AiChatModelConfig[]>('/ai/model-configs');
}

export async function updateDefaultAiModelConfig(
  payload: IApiAiChat.DefaultModelConfigPayload,
): Promise<IApiAiChat.DefaultModelConfigPayload> {
  return alovaPost<IApiAiChat.DefaultModelConfigPayload>('/ai/model-configs/default', payload);
}

export async function createAiModelConfig(
  payload: Required<Pick<IApiAiChat.ModelConfigPayload, 'modelId' | 'name' | 'providerConfigId'>> &
    IApiAiChat.ModelConfigPayload,
): Promise<AiChatModelConfig> {
  return alovaPost<AiChatModelConfig>('/ai/model-configs', payload);
}

export async function updateAiModelConfig(
  id: string,
  payload: IApiAiChat.ModelConfigPayload,
): Promise<AiChatModelConfig> {
  return alovaInstance.Patch<AiChatModelConfig>(`/ai/model-configs/${id}`, payload, {
    meta: { showSuccessMessage: true },
  });
}

export async function deleteAiModelConfig(id: string): Promise<void> {
  await alovaDelete(`/ai/model-configs/${id}`);
}

export async function getAiConversations(params?: {
  keyword?: string;
  page?: number;
  pageSize?: number;
}): Promise<IApiAiChat.ConversationListResponse> {
  return alovaGet<IApiAiChat.ConversationListResponse>('/ai/conversations', params);
}

export async function createAiConversation(payload: {
  modelConfigId?: string;
  systemPrompt?: string | null;
  title?: string;
}): Promise<AiChatConversation> {
  return alovaPost<AiChatConversation>('/ai/conversations', payload);
}

export async function getAiConversationMessages(
  conversationId: string,
): Promise<IApiAiChat.ConversationMessagesResponse> {
  return alovaGet<IApiAiChat.ConversationMessagesResponse>(
    `/ai/conversations/${conversationId}/messages`,
  );
}

export async function updateAiConversation(
  id: string,
  payload: { modelConfigId?: string | null; systemPrompt?: string | null; title?: string },
): Promise<AiChatConversation> {
  return alovaInstance.Patch<AiChatConversation>(`/ai/conversations/${id}`, payload, {
    meta: { showSuccessMessage: true },
  });
}

export async function deleteAiConversation(id: string): Promise<void> {
  await alovaDelete(`/ai/conversations/${id}`);
}

export async function stopAiChat(payload: IApiAiChat.ChatStopPayload): Promise<void> {
  await alovaPost('/ai/chat/stop', payload);
}

export interface ClientSseEvent {
  data: string;
  event: string;
}

export async function* parseClientSse(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<ClientSseEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    // eslint-disable-next-line no-await-in-loop -- Stream readers must be consumed sequentially.
    const { done, value } = await reader.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    while (buffer.includes('\n\n')) {
      const index = buffer.indexOf('\n\n');
      const raw = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      const lines = raw.split(/\r?\n/u);
      const event =
        lines
          .find((line) => line.startsWith('event:'))
          ?.slice(6)
          .trim() ?? 'message';
      const data = lines
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n');

      if (data) {
        yield { event, data };
      }
    }
  }
}
