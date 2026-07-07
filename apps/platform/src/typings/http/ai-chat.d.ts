declare namespace IApiAiChat {
  type ProviderKind = string;
  type ChatRole = 'ASSISTANT' | 'SYSTEM' | 'TOOL' | 'USER';
  type ChatMessageStatus = 'COMPLETED' | 'ERROR' | 'STOPPED' | 'STREAMING';

  interface ProviderConfig {
    id: string;
    name: string;
    provider: ProviderKind;
    baseUrl: string | null;
    keyLast4: string;
    isEnabled: boolean;
    lastVerifiedAt: string | null;
    lastVerifyError: string | null;
    createdAt: string;
    updatedAt: string;
  }

  interface ProviderConfigPayload {
    apiKey?: string;
    baseUrl?: string | null;
    isEnabled?: boolean;
    name?: string;
    provider?: ProviderKind;
  }

  interface ModelConfig {
    id: string;
    providerConfigId: string;
    providerName: string;
    provider: ProviderKind;
    name: string;
    modelId: string;
    systemPrompt: string | null;
    generationDefaults: unknown;
    maxOutputTokens: number | null;
    isEnabled: boolean;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
  }

  interface ModelConfigPayload {
    providerConfigId?: string;
    name?: string;
    modelId?: string;
    systemPrompt?: string | null;
    generationDefaults?: {
      temperature?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
    };
    maxOutputTokens?: number | null;
    isEnabled?: boolean;
    isDefault?: boolean;
  }

  interface DefaultModelConfigPayload {
    credentialId: string;
    modelId: string;
  }

  interface Conversation {
    id: string;
    title: string;
    modelConfigId: string | null;
    modelName: string | null;
    lastMessageAt: string;
    createdAt: string;
  }

  interface ConversationListResponse {
    list: Conversation[];
    total: number;
    page: number;
    pageSize: number;
  }

  interface ChatMessage {
    id: string;
    role: ChatRole;
    content: string;
    status: ChatMessageStatus;
    usage?: unknown;
    metadata?: unknown;
    errorCode?: string | null;
    createdAt: string;
  }

  interface ConversationMessagesResponse {
    conversation: {
      id: string;
      title: string;
      modelConfigId: string | null;
      systemPrompt: string | null;
      modelSnapshot: unknown;
      createdAt: string;
      updatedAt: string;
    };
    messages: ChatMessage[];
  }

  interface ChatStreamPayload {
    conversationId?: string;
    modelConfigId?: string;
    content: string;
  }

  interface ChatStopPayload {
    conversationId: string;
    assistantMessageId: string;
  }
}
