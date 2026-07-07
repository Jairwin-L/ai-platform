import crypto from 'node:crypto';
import type { AiModelConfig, AiProviderConfig, AiProviderKind, Prisma } from '@/generated/prisma/client';
import { AiPublicError } from './errors';
import { assertSafeBaseUrl } from './validation';
import { createProviderSecretAad, decryptSecret, encryptSecret, getSecretLast4 } from './secret';
import { buildChatContextMessages, buildSystemPrompt } from './context';
import { BYOK_CREDENTIAL_STATUS } from './byok/constants';
import { getEnabledAiProviderOptions, type EnabledAiProviderOption } from './byok/provider-options';
import { getStoredAiProviderOptions } from './byok/provider-options-store';
import { getUserDefaultModelConfig, listUserApiCredentials } from './byok/service';
import { prisma } from '@/lib/prisma';
import type {
  AiUsagePayload,
  PublicChatMessage,
  PublicConversation,
  PublicModelConfig,
  PublicProviderConfig,
} from './types';

type ModelWithProvider = AiModelConfig & {
  providerConfig: AiProviderConfig;
};

interface ByokModelConfig {
  credentialId: string;
  generationDefaults: null;
  id: string;
  isDefault: boolean;
  isEnabled: boolean;
  maxOutputTokens: null;
  modelId: string;
  name: string;
  provider: string;
  providerConfigId: string;
  providerName: string;
  providerOption: EnabledAiProviderOption;
  systemPrompt: null;
}

interface ProviderConfigInput {
  apiKey?: string;
  baseUrl?: string | null;
  isEnabled?: boolean;
  name?: string;
  provider?: AiProviderKind;
}

interface ModelConfigInput {
  generationDefaults?: Record<string, unknown>;
  isDefault?: boolean;
  isEnabled?: boolean;
  maxOutputTokens?: number | null;
  modelId?: string;
  name?: string;
  providerConfigId?: string;
  systemPrompt?: string | null;
}

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function compactNullable<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as T;
}

function createByokModelConfigId(credentialId: string, modelId: string): string {
  return `byok:${credentialId}:${Buffer.from(modelId, 'utf8').toString('base64url')}`;
}

function parseByokModelConfigId(modelConfigId?: string | null): {
  credentialId: string;
  modelId: string;
} | null {
  if (!modelConfigId?.startsWith('byok:')) {
    return null;
  }

  const [, credentialId, encodedModelId] = modelConfigId.split(':');

  if (!credentialId || !encodedModelId) {
    return null;
  }

  try {
    return {
      credentialId,
      modelId: Buffer.from(encodedModelId, 'base64url').toString('utf8'),
    };
  } catch {
    return null;
  }
}

function toPublicProviderConfig(providerConfig: AiProviderConfig): PublicProviderConfig {
  return {
    id: providerConfig.id,
    name: providerConfig.name,
    provider: providerConfig.provider,
    baseUrl: providerConfig.baseUrl,
    keyLast4: providerConfig.keyLast4,
    isEnabled: providerConfig.isEnabled,
    lastVerifiedAt: toIso(providerConfig.lastVerifiedAt),
    lastVerifyError: providerConfig.lastVerifyError,
    createdAt: providerConfig.createdAt.toISOString(),
    updatedAt: providerConfig.updatedAt.toISOString(),
  };
}

function toPublicModelConfig(modelConfig: ModelWithProvider): PublicModelConfig {
  return {
    id: modelConfig.id,
    providerConfigId: modelConfig.providerConfigId,
    providerName: modelConfig.providerConfig.name,
    provider: modelConfig.providerConfig.provider,
    name: modelConfig.name,
    modelId: modelConfig.modelId,
    systemPrompt: modelConfig.systemPrompt,
    generationDefaults: modelConfig.generationDefaults,
    maxOutputTokens: modelConfig.maxOutputTokens,
    isEnabled: modelConfig.isEnabled,
    isDefault: modelConfig.isDefault,
    createdAt: modelConfig.createdAt.toISOString(),
    updatedAt: modelConfig.updatedAt.toISOString(),
  };
}

function toPublicConversation(
  conversation: {
    id: string;
    title: string;
    modelConfigId: string | null;
    modelSnapshot: Prisma.JsonValue | null;
    lastMessageAt: Date;
    createdAt: Date;
  },
): PublicConversation {
  const snapshot = conversation.modelSnapshot as { name?: unknown } | null;

  return {
    id: conversation.id,
    title: conversation.title,
    modelConfigId: conversation.modelConfigId,
    modelName: typeof snapshot?.name === 'string' ? snapshot.name : null,
    lastMessageAt: conversation.lastMessageAt.toISOString(),
    createdAt: conversation.createdAt.toISOString(),
  };
}

export function toPublicChatMessage(message: {
  id: string;
  role: PublicChatMessage['role'];
  content: string;
  status: PublicChatMessage['status'];
  usage: Prisma.JsonValue | null;
  metadata: Prisma.JsonValue | null;
  errorCode: string | null;
  createdAt: Date;
}): PublicChatMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    status: message.status,
    usage: message.usage ?? undefined,
    metadata: message.metadata ?? undefined,
    errorCode: message.errorCode,
    createdAt: message.createdAt.toISOString(),
  };
}

async function normalizeBaseUrl(input: ProviderConfigInput): Promise<string | null | undefined> {
  if (input.baseUrl === undefined) {
    return undefined;
  }

  if (input.baseUrl === null || input.baseUrl.trim() === '') {
    return null;
  }

  return assertSafeBaseUrl(input.baseUrl);
}

function createByokModelSnapshot(modelConfig: ByokModelConfig): Prisma.InputJsonObject {
  return {
    provider: modelConfig.provider,
    providerConfigId: modelConfig.providerConfigId,
    providerName: modelConfig.providerName,
    credentialId: modelConfig.credentialId,
    modelConfigId: modelConfig.id,
    modelId: modelConfig.modelId,
    name: modelConfig.name,
    generationDefaults: null,
    maxOutputTokens: null,
    systemPrompt: null,
  };
}

export async function listProviderConfigs(userId: string): Promise<PublicProviderConfig[]> {
  const providerConfigs = await prisma.aiProviderConfig.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return providerConfigs.map(toPublicProviderConfig);
}

export async function createProviderConfig(
  userId: string,
  input: Required<Pick<ProviderConfigInput, 'apiKey' | 'name' | 'provider'>> &
    Pick<ProviderConfigInput, 'baseUrl' | 'isEnabled'>,
): Promise<PublicProviderConfig> {
  const id = crypto.randomUUID();
  const baseUrl = await normalizeBaseUrl(input);

  if (input.provider === 'OPENAI_COMPATIBLE' && !baseUrl) {
    throw new AiPublicError('INVALID_BASE_URL', 422);
  }

  const encrypted = encryptSecret(input.apiKey, createProviderSecretAad(userId, id));
  const providerConfig = await prisma.aiProviderConfig.create({
    data: {
      id,
      userId,
      name: input.name,
      provider: input.provider,
      baseUrl,
      ...encrypted,
      keyLast4: getSecretLast4(input.apiKey),
      isEnabled: input.isEnabled ?? true,
    },
  });

  return toPublicProviderConfig(providerConfig);
}

export async function updateProviderConfig(
  userId: string,
  providerConfigId: string,
  input: ProviderConfigInput,
): Promise<PublicProviderConfig> {
  const current = await prisma.aiProviderConfig.findFirst({
    where: { id: providerConfigId, userId },
  });

  if (!current) {
    throw new AiPublicError('NOT_FOUND', 404);
  }

  const baseUrl = await normalizeBaseUrl(input);
  const encrypted = input.apiKey
    ? encryptSecret(input.apiKey, createProviderSecretAad(userId, current.id))
    : undefined;
  const nextProvider = input.provider ?? current.provider;
  const nextBaseUrl = baseUrl === undefined ? current.baseUrl : baseUrl;

  if (nextProvider === 'OPENAI_COMPATIBLE' && !nextBaseUrl) {
    throw new AiPublicError('INVALID_BASE_URL', 422);
  }

  const providerConfig = await prisma.aiProviderConfig.update({
    where: { id: providerConfigId },
    data: compactNullable({
      name: input.name,
      provider: input.provider,
      baseUrl,
      isEnabled: input.isEnabled,
      ...encrypted,
      keyLast4: input.apiKey ? getSecretLast4(input.apiKey) : undefined,
      lastVerifyError: input.apiKey || baseUrl !== undefined ? null : undefined,
      lastVerifiedAt: input.apiKey || baseUrl !== undefined ? null : undefined,
    }),
  });

  return toPublicProviderConfig(providerConfig);
}

export async function deleteProviderConfig(userId: string, providerConfigId: string): Promise<void> {
  const providerConfig = await prisma.aiProviderConfig.findFirst({
    where: { id: providerConfigId, userId },
    select: { id: true },
  });

  if (!providerConfig) {
    throw new AiPublicError('NOT_FOUND', 404);
  }

  await prisma.aiProviderConfig.delete({ where: { id: providerConfig.id } });
}

export async function verifyProviderConfig(userId: string, providerConfigId: string) {
  const providerConfig = await prisma.aiProviderConfig.findFirst({
    where: { id: providerConfigId, userId },
  });

  if (!providerConfig) {
    throw new AiPublicError('NOT_FOUND', 404);
  }

  if (!providerConfig.baseUrl || providerConfig.provider !== 'OPENAI_COMPATIBLE') {
    throw new AiPublicError('PROVIDER_NOT_AVAILABLE', 400);
  }

  const apiKey = decryptSecret(providerConfig, createProviderSecretAad(userId, providerConfig.id));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(`${providerConfig.baseUrl.replace(/\/+$/u, '')}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const updated = await prisma.aiProviderConfig.update({
      where: { id: providerConfig.id },
      data: { lastVerifiedAt: new Date(), lastVerifyError: null },
    });

    return { ok: true, providerConfig: toPublicProviderConfig(updated) };
  } catch {
    const updated = await prisma.aiProviderConfig.update({
      where: { id: providerConfig.id },
      data: { lastVerifiedAt: new Date(), lastVerifyError: '连接验证失败' },
    });

    return { ok: false, providerConfig: toPublicProviderConfig(updated), error: '连接验证失败' };
  } finally {
    clearTimeout(timeout);
  }
}

export async function listModelConfigs(userId: string): Promise<PublicModelConfig[]> {
  const credentials = (await listUserApiCredentials(userId)).credentials.filter(
    (credential) =>
      credential.status === BYOK_CREDENTIAL_STATUS.ACTIVE && credential.remainingSeconds > 0,
  );
  const providerOptions = getEnabledAiProviderOptions(await getStoredAiProviderOptions());
  const providerOptionsByValue = new Map(providerOptions.map((option) => [option.value, option]));
  const defaultModelConfig = await getUserDefaultModelConfig(userId);

  return credentials.flatMap((credential) => {
    const providerOption = providerOptionsByValue.get(credential.provider);

    if (!providerOption) {
      return [];
    }

    return providerOption.models.map((modelId) => ({
      id: createByokModelConfigId(credential.credentialId, modelId),
      providerConfigId: credential.credentialId,
      providerName: providerOption.label,
      provider: providerOption.value,
      name: credential.label,
      modelId,
      systemPrompt: null,
      generationDefaults: null,
      maxOutputTokens: null,
      isEnabled: true,
      isDefault:
        defaultModelConfig?.credentialId === credential.credentialId &&
        defaultModelConfig.modelId === modelId,
      createdAt: credential.expiresAt,
      updatedAt: credential.lastUsedAt ?? credential.expiresAt,
    }));
  });
}

async function assertUserProviderConfig(userId: string, providerConfigId: string) {
  const providerConfig = await prisma.aiProviderConfig.findFirst({
    where: { id: providerConfigId, userId },
  });

  if (!providerConfig) {
    throw new AiPublicError('PROVIDER_NOT_AVAILABLE', 404);
  }

  return providerConfig;
}

async function clearOtherDefaultModels(userId: string): Promise<void> {
  await prisma.aiModelConfig.updateMany({
    where: { providerConfig: { userId } },
    data: { isDefault: false },
  });
}

export async function createModelConfig(
  userId: string,
  input: Required<Pick<ModelConfigInput, 'modelId' | 'name' | 'providerConfigId'>> &
    Omit<ModelConfigInput, 'modelId' | 'name' | 'providerConfigId'>,
): Promise<PublicModelConfig> {
  await assertUserProviderConfig(userId, input.providerConfigId);

  if (input.isDefault) {
    await clearOtherDefaultModels(userId);
  }

  const modelConfig = await prisma.aiModelConfig.create({
    data: {
      providerConfigId: input.providerConfigId,
      name: input.name,
      modelId: input.modelId,
      systemPrompt: input.systemPrompt,
      generationDefaults: input.generationDefaults as Prisma.InputJsonValue,
      maxOutputTokens: input.maxOutputTokens,
      isEnabled: input.isEnabled ?? true,
      isDefault: input.isDefault ?? false,
    },
    include: { providerConfig: true },
  });

  return toPublicModelConfig(modelConfig);
}

export async function updateModelConfig(
  userId: string,
  modelConfigId: string,
  input: ModelConfigInput,
): Promise<PublicModelConfig> {
  const current = await prisma.aiModelConfig.findFirst({
    where: { id: modelConfigId, providerConfig: { userId } },
    include: { providerConfig: true },
  });

  if (!current) {
    throw new AiPublicError('NOT_FOUND', 404);
  }

  if (input.providerConfigId) {
    await assertUserProviderConfig(userId, input.providerConfigId);
  }

  if (input.isDefault) {
    await clearOtherDefaultModels(userId);
  }

  const modelConfig = await prisma.aiModelConfig.update({
    where: { id: modelConfigId },
    data: compactNullable({
      providerConfigId: input.providerConfigId,
      name: input.name,
      modelId: input.modelId,
      systemPrompt: input.systemPrompt,
      generationDefaults: input.generationDefaults as Prisma.InputJsonValue | undefined,
      maxOutputTokens: input.maxOutputTokens,
      isEnabled: input.isEnabled,
      isDefault: input.isDefault,
    }),
    include: { providerConfig: true },
  });

  return toPublicModelConfig(modelConfig);
}

export async function deleteModelConfig(userId: string, modelConfigId: string): Promise<void> {
  const modelConfig = await prisma.aiModelConfig.findFirst({
    where: { id: modelConfigId, providerConfig: { userId } },
    select: { id: true },
  });

  if (!modelConfig) {
    throw new AiPublicError('NOT_FOUND', 404);
  }

  await prisma.aiModelConfig.delete({ where: { id: modelConfig.id } });
}

async function getAvailableByokModelConfig(
  userId: string,
  modelConfigId?: string | null,
): Promise<ByokModelConfig> {
  const modelConfigs = await listModelConfigs(userId);
  const selectedModelConfig = modelConfigId
    ? modelConfigs.find((modelConfig) => modelConfig.id === modelConfigId)
    : (modelConfigs.find((modelConfig) => modelConfig.isDefault) ?? modelConfigs[0]);

  if (!selectedModelConfig) {
    throw new AiPublicError('MODEL_NOT_AVAILABLE', 404);
  }

  const parsed = parseByokModelConfigId(selectedModelConfig.id);

  if (!parsed) {
    throw new AiPublicError('MODEL_NOT_AVAILABLE', 404);
  }

  const providerOption = getEnabledAiProviderOptions(await getStoredAiProviderOptions()).find(
    (option) => option.value === selectedModelConfig.provider,
  );

  if (!providerOption || !providerOption.models.includes(parsed.modelId)) {
    throw new AiPublicError('MODEL_NOT_AVAILABLE', 404);
  }

  return {
    credentialId: parsed.credentialId,
    generationDefaults: null,
    id: selectedModelConfig.id,
    isDefault: selectedModelConfig.isDefault,
    isEnabled: selectedModelConfig.isEnabled,
    maxOutputTokens: null,
    modelId: parsed.modelId,
    name: selectedModelConfig.name,
    provider: providerOption.value,
    providerConfigId: selectedModelConfig.providerConfigId,
    providerName: providerOption.label,
    providerOption,
    systemPrompt: null,
  };
}

export async function listConversations(
  userId: string,
  input: { keyword?: string; page: number; pageSize: number },
) {
  const where: Prisma.ChatConversationWhereInput = {
    userId,
    deletedAt: null,
    ...(input.keyword ? { title: { contains: input.keyword, mode: 'insensitive' } } : {}),
  };
  const [listResult, totalResult] = await Promise.allSettled([
    prisma.chatConversation.findMany({
      where,
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      orderBy: { lastMessageAt: 'desc' },
    }),
    prisma.chatConversation.count({ where }),
  ]);
  if (listResult.status === 'rejected') {
    throw listResult.reason;
  }

  if (totalResult.status === 'rejected') {
    throw totalResult.reason;
  }

  const list = listResult.value;
  const total = totalResult.value;

  return {
    list: list.map(toPublicConversation),
    total,
    page: input.page,
    pageSize: input.pageSize,
  };
}

export async function createConversation(
  userId: string,
  input: { modelConfigId?: string; systemPrompt?: string | null; title?: string },
) {
  const modelConfig = await getAvailableByokModelConfig(userId, input.modelConfigId);
  const conversation = await prisma.chatConversation.create({
    data: {
      userId,
      title: input.title ?? '新建对话',
      modelConfigId: modelConfig.id,
      systemPrompt: input.systemPrompt,
      modelSnapshot: createByokModelSnapshot(modelConfig),
    },
  });

  return toPublicConversation(conversation);
}

export async function getConversationMessages(userId: string, conversationId: string) {
  const staleDate = new Date(Date.now() - 5 * 60 * 1000);
  const conversation = await prisma.chatConversation.findFirst({
    where: { id: conversationId, userId, deletedAt: null },
  });

  if (!conversation) {
    throw new AiPublicError('NOT_FOUND', 404);
  }

  await prisma.chatMessage.updateMany({
    where: {
      conversationId,
      status: 'STREAMING',
      updatedAt: { lt: staleDate },
    },
    data: { status: 'STOPPED' },
  });

  const messages = await prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: { sequence: 'asc' },
  });

  return {
    conversation: {
      id: conversation.id,
      title: conversation.title,
      modelConfigId: conversation.modelConfigId,
      systemPrompt: conversation.systemPrompt,
      modelSnapshot: conversation.modelSnapshot,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    },
    messages: messages.map(toPublicChatMessage),
  };
}

export async function updateConversation(
  userId: string,
  conversationId: string,
  input: { modelConfigId?: string | null; systemPrompt?: string | null; title?: string },
) {
  const conversation = await prisma.chatConversation.findFirst({
    where: { id: conversationId, userId, deletedAt: null },
  });

  if (!conversation) {
    throw new AiPublicError('NOT_FOUND', 404);
  }

  let modelSnapshot: Prisma.InputJsonObject | undefined;

  if (input.modelConfigId) {
    const modelConfig = await getAvailableByokModelConfig(userId, input.modelConfigId);
    modelSnapshot = createByokModelSnapshot(modelConfig);
  }

  const updated = await prisma.chatConversation.update({
    where: { id: conversation.id },
    data: compactNullable({
      title: input.title,
      modelConfigId: input.modelConfigId,
      systemPrompt: input.systemPrompt,
      modelSnapshot,
    }),
  });

  return toPublicConversation(updated);
}

export async function deleteConversation(userId: string, conversationId: string): Promise<void> {
  const conversation = await prisma.chatConversation.findFirst({
    where: { id: conversationId, userId, deletedAt: null },
  });

  if (!conversation) {
    throw new AiPublicError('NOT_FOUND', 404);
  }

  const streamingCount = await prisma.chatMessage.count({
    where: { conversationId: conversation.id, status: 'STREAMING' },
  });

  if (streamingCount > 0) {
    throw new AiPublicError('CONVERSATION_BUSY', 409);
  }

  await prisma.chatConversation.update({
    where: { id: conversation.id },
    data: { deletedAt: new Date() },
  });
}

export async function prepareChatStream(
  userId: string,
  input: { content: string; conversationId?: string; modelConfigId?: string },
) {
  const now = new Date();
  let modelConfig: ByokModelConfig;
  let conversation = input.conversationId
    ? await prisma.chatConversation.findFirst({
        where: { id: input.conversationId, userId },
      })
    : null;

  if (conversation?.deletedAt) {
    throw new AiPublicError('CONVERSATION_DELETED', 410);
  }

  if (!conversation) {
    modelConfig = await getAvailableByokModelConfig(userId, input.modelConfigId);
    conversation = await prisma.chatConversation.create({
      data: {
        userId,
        title: input.content.slice(0, 40),
        modelConfigId: modelConfig.id,
        modelSnapshot: createByokModelSnapshot(modelConfig),
        lastMessageAt: now,
      },
    });
  } else {
    modelConfig = await getAvailableByokModelConfig(
      userId,
      input.modelConfigId ?? conversation.modelConfigId,
    );

    if (input.modelConfigId && input.modelConfigId !== conversation.modelConfigId) {
      conversation = await prisma.chatConversation.update({
        where: { id: conversation.id },
        data: {
          modelConfigId: modelConfig.id,
          modelSnapshot: createByokModelSnapshot(modelConfig),
        },
      });
    }
  }

  const streamingCount = await prisma.chatMessage.count({
    where: { conversationId: conversation.id, status: 'STREAMING' },
  });

  if (streamingCount > 0) {
    throw new AiPublicError('CONVERSATION_BUSY', 409);
  }

  const lastMessage = await prisma.chatMessage.findFirst({
    where: { conversationId: conversation.id },
    orderBy: { sequence: 'desc' },
    select: { sequence: true },
  });
  const userSequence = (lastMessage?.sequence ?? 0) + 1;
  const assistantSequence = userSequence + 1;
  const snapshot = createByokModelSnapshot(modelConfig);

  const [userMessage, assistantMessage] = await prisma.$transaction([
    prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        sequence: userSequence,
        role: 'USER',
        content: input.content,
        status: 'COMPLETED',
        modelSnapshot: snapshot,
      },
    }),
    prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        sequence: assistantSequence,
        role: 'ASSISTANT',
        content: '',
        status: 'STREAMING',
        modelSnapshot: snapshot,
      },
    }),
    prisma.chatConversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: now },
    }),
  ]);
  const history = await prisma.chatMessage.findMany({
    where: {
      conversationId: conversation.id,
      id: { not: assistantMessage.id },
      OR: [{ status: { not: 'ERROR' } }, { content: { not: '' } }],
    },
    orderBy: { sequence: 'asc' },
    take: 50,
  });
  const systemPrompt = buildSystemPrompt(conversation.systemPrompt, modelConfig.systemPrompt);
  const messages = buildChatContextMessages(history, systemPrompt);

  return {
    assistantMessage,
    conversation,
    messages,
    modelConfig,
    userMessage,
  };
}

export async function appendAssistantContent(input: {
  assistantMessageId: string;
  content: string;
  usage?: AiUsagePayload;
}): Promise<void> {
  await prisma.chatMessage.update({
    where: { id: input.assistantMessageId },
    data: {
      content: input.content,
      usage: input.usage as Prisma.InputJsonValue,
    },
  });
}

export async function finalizeAssistantMessage(input: {
  assistantMessageId: string;
  content: string;
  conversationId: string;
  errorCode?: string;
  status: 'COMPLETED' | 'ERROR' | 'STOPPED';
  usage?: AiUsagePayload;
}): Promise<void> {
  await prisma.$transaction([
    prisma.chatMessage.update({
      where: { id: input.assistantMessageId },
      data: {
        content: input.content,
        status: input.status,
        usage: input.usage as Prisma.InputJsonValue,
        errorCode: input.errorCode,
      },
    }),
    prisma.chatConversation.update({
      where: { id: input.conversationId },
      data: { lastMessageAt: new Date() },
    }),
  ]);
}

export async function stopAssistantMessage(
  userId: string,
  input: { assistantMessageId: string; conversationId: string },
): Promise<void> {
  const conversation = await prisma.chatConversation.findFirst({
    where: { id: input.conversationId, userId, deletedAt: null },
  });

  if (!conversation) {
    throw new AiPublicError('NOT_FOUND', 404);
  }

  const message = await prisma.chatMessage.findFirst({
    where: {
      id: input.assistantMessageId,
      conversationId: conversation.id,
      role: 'ASSISTANT',
    },
  });

  if (!message) {
    throw new AiPublicError('NOT_FOUND', 404);
  }

  if (message.status === 'STREAMING') {
    await prisma.chatMessage.update({
      where: { id: message.id },
      data: { status: 'STOPPED' },
    });
  }
}
