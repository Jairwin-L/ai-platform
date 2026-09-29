import type { AiProviderKind, ChatMessageStatus, ChatRole } from '@/generated/prisma/client';

export interface AiSecretPayload {
  apiKeyCiphertext: string;
  apiKeyIv: string;
  apiKeyTag: string;
  keyVersion?: number;
}

export interface AiUsagePayload {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface AiChatAdapterChunk {
  type: 'delta' | 'usage' | 'done';
  delta?: string;
  usage?: AiUsagePayload;
}

export interface AiChatAdapterInput {
  apiKey: string;
  baseUrl: string;
  generationDefaults?: Record<string, unknown>;
  maxOutputTokens?: number;
  messages: Array<{
    role: 'assistant' | 'system' | 'tool' | 'user';
    content: string;
  }>;
  model: string;
  signal?: AbortSignal;
}

export interface AiChatAdapter {
  streamChat(input: AiChatAdapterInput): AsyncGenerator<AiChatAdapterChunk>;
}

export interface PublicProviderConfig {
  id: string;
  name: string;
  provider: AiProviderKind;
  baseUrl: string | null;
  keyLast4: string;
  isEnabled: boolean;
  lastVerifiedAt: string | null;
  lastVerifyError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicModelConfig {
  id: string;
  providerConfigId: string;
  providerName: string;
  provider: string;
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

export interface PublicConversation {
  id: string;
  title: string;
  modelConfigId: string | null;
  modelName: string | null;
  lastMessageAt: string;
  createdAt: string;
}

export interface PublicChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  status: ChatMessageStatus;
  usage?: unknown;
  metadata?: unknown;
  errorCode?: string | null;
  createdAt: string;
}

export type AiErrorCode =
  | 'AI_PROVIDER_UNAVAILABLE'
  | 'BYOK_KEY_INVALID'
  | 'BYOK_KEY_UNAVAILABLE'
  | 'CONVERSATION_BUSY'
  | 'CONVERSATION_DELETED'
  | 'FORBIDDEN'
  | 'INVALID_BASE_URL'
  | 'INVALID_REQUEST'
  | 'RATE_LIMITED'
  | 'MODEL_NOT_AVAILABLE'
  | 'NOT_FOUND'
  | 'PROVIDER_NOT_AVAILABLE'
  | 'STREAM_ABORTED'
  | 'UNSUPPORTED_PROVIDER'
  | 'UNAUTHORIZED'
  | 'UPSTREAM_ERROR';
