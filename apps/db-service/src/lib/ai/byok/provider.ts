import {
  BYOK_CHAT_LIMITS,
  BYOK_ERROR_CODE,
  type ByokProvider,
} from './constants';
import { ByokPublicError } from './errors';
import type { ChatRequestInput } from './schemas';

export type ChatCompletionResult = IByok.ChatCompletionResult;
export type CallableAiProviderOption = IByok.EnabledAiProviderOption;

const MESSAGES_API_VERSION = '2023-06-01';

function isModelAllowed(providerOption: CallableAiProviderOption, model: string): boolean {
  return providerOption.models.includes(model);
}

function hasWhitespaceOrControlCharacter(value: string): boolean {
  return Array.from(value).some((char) => {
    const code = char.charCodeAt(0);

    return char.trim() === '' || code <= 31 || code === 127;
  });
}

export function validateProviderApiKey(_provider: ByokProvider, apiKey: string): boolean {
  return Boolean(
    apiKey &&
      apiKey.trim() === apiKey &&
      !hasWhitespaceOrControlCharacter(apiKey),
  );
}

async function getProviderErrorPayload(response: Response): Promise<IByok.ProviderErrorPayload | null> {
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.toLowerCase().includes('application/json')) {
    return null;
  }

  try {
    const value = (await response.json()) as unknown;

    return typeof value === 'object' && value !== null ? (value as IByok.ProviderErrorPayload) : null;
  } catch {
    return null;
  }
}

function getErrorText(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

function getProviderErrorMessage(payload: IByok.ProviderErrorPayload | null): string | undefined {
  const message = typeof payload?.error?.message === 'string' ? payload.error.message.trim() : '';

  if (!message) {
    return undefined;
  }

  return message.length > 240 ? `${message.slice(0, 240)}...` : message;
}

function isProviderAuthenticationFailure(
  response: Response,
  payload: IByok.ProviderErrorPayload | null,
): boolean {
  if (response.status === 401 || response.status === 403) {
    return true;
  }

  const code = getErrorText(payload?.error?.code);
  const status = getErrorText(payload?.error?.status);
  const type = getErrorText(payload?.error?.type);
  const message = getErrorText(payload?.error?.message);

  return (
    code === 'invalid_api_key' ||
    code === 'account_deactivated' ||
    code === 'key_revoked' ||
    status === 'unauthenticated' ||
    type === 'authentication_error' ||
    message.includes('invalid api key') ||
    message.includes('incorrect api key') ||
    message.includes('api key not valid') ||
    message.includes('revoked')
  );
}

function toProviderUnavailableError(
  response: Response,
  payload: IByok.ProviderErrorPayload | null,
): ByokPublicError {
  const providerMessage = getProviderErrorMessage(payload);

  if (providerMessage) {
    return new ByokPublicError(
      response.status === 429
        ? BYOK_ERROR_CODE.RATE_LIMITED
        : BYOK_ERROR_CODE.AI_PROVIDER_UNAVAILABLE,
      response.status === 429 ? 429 : 503,
      `AI Provider 请求失败：${providerMessage}`,
    );
  }

  return new ByokPublicError(
    response.status === 429
      ? BYOK_ERROR_CODE.RATE_LIMITED
      : BYOK_ERROR_CODE.AI_PROVIDER_UNAVAILABLE,
    response.status === 429 ? 429 : 503,
  );
}

async function assertProviderResponseOk(response: Response): Promise<void> {
  if (response.ok) {
    return;
  }

  const errorPayload = await getProviderErrorPayload(response);

  if (isProviderAuthenticationFailure(response, errorPayload)) {
    throw new ByokPublicError(BYOK_ERROR_CODE.BYOK_KEY_INVALID, 401);
  }

  throw toProviderUnavailableError(response, errorPayload);
}

function getChatCompletionsContent(data: unknown): string | null {
  const value = data as IByok.ChatCompletionsResponse;

  return value.choices?.[0]?.message?.content ?? null;
}

function getMessagesContent(data: unknown): string | null {
  const value = data as IByok.MessagesResponse;

  return value.content
    ?.filter((part) => part.type === 'text' || typeof part.text === 'string')
    .map((part) => part.text || '')
    .join('') ?? null;
}

function getGenerateContent(data: unknown): string | null {
  const value = data as IByok.GenerateContentResponse;

  return value.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') ?? null;
}

function buildMessagesBody(input: ChatRequestInput) {
  const system = input.messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content)
    .join('\n\n');
  const messages = input.messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content,
    }));

  return {
    model: input.model,
    max_tokens: 1024,
    messages,
    ...(system ? { system } : {}),
  };
}

function buildGenerateContentBody(input: ChatRequestInput) {
  const system = input.messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content)
    .join('\n\n');
  const contents = input.messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    }));

  return {
    contents,
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
  };
}

function buildGenerateContentUrl(baseUrl: string, model: string): string {
  return `${baseUrl.replace(/\/+$/u, '')}/${encodeURIComponent(model)}:generateContent`;
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, BYOK_CHAT_LIMITS.timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function callChatCompletionsProvider(
  apiKey: string,
  providerOption: CallableAiProviderOption,
  input: ChatRequestInput,
): Promise<ChatCompletionResult> {
  const response = await fetchWithTimeout(providerOption.chatBaseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: input.model,
      messages: input.messages,
    }),
  });

  await assertProviderResponseOk(response);
  const data = (await response.json()) as unknown;
  const content = getChatCompletionsContent(data);

  if (content === null) {
    throw new ByokPublicError(BYOK_ERROR_CODE.AI_PROVIDER_UNAVAILABLE, 503);
  }

  return { provider: providerOption.value, model: input.model, content };
}

async function callMessagesProvider(
  apiKey: string,
  providerOption: CallableAiProviderOption,
  input: ChatRequestInput,
): Promise<ChatCompletionResult> {
  const response = await fetchWithTimeout(providerOption.chatBaseUrl, {
    method: 'POST',
    headers: {
      'anthropic-version': MESSAGES_API_VERSION,
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(buildMessagesBody(input)),
  });

  await assertProviderResponseOk(response);
  const data = (await response.json()) as unknown;
  const content = getMessagesContent(data);

  if (content === null) {
    throw new ByokPublicError(BYOK_ERROR_CODE.AI_PROVIDER_UNAVAILABLE, 503);
  }

  return { provider: providerOption.value, model: input.model, content };
}

async function callGenerateContentProvider(
  apiKey: string,
  providerOption: CallableAiProviderOption,
  input: ChatRequestInput,
): Promise<ChatCompletionResult> {
  const response = await fetchWithTimeout(
    buildGenerateContentUrl(providerOption.chatBaseUrl, input.model),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(buildGenerateContentBody(input)),
    },
  );

  await assertProviderResponseOk(response);
  const data = (await response.json()) as unknown;
  const content = getGenerateContent(data);

  if (content === null) {
    throw new ByokPublicError(BYOK_ERROR_CODE.AI_PROVIDER_UNAVAILABLE, 503);
  }

  return { provider: providerOption.value, model: input.model, content };
}

export async function callAiProvider(
  apiKey: string,
  providerOption: CallableAiProviderOption,
  input: ChatRequestInput,
): Promise<ChatCompletionResult> {
  if (!isModelAllowed(providerOption, input.model)) {
    throw new ByokPublicError(BYOK_ERROR_CODE.INVALID_REQUEST, 400);
  }

  try {
    if (providerOption.protocol === 'chat-completions') {
      return await callChatCompletionsProvider(apiKey, providerOption, input);
    }

    if (providerOption.protocol === 'messages') {
      return await callMessagesProvider(apiKey, providerOption, input);
    }

    if (providerOption.protocol === 'generate-content') {
      return await callGenerateContentProvider(apiKey, providerOption, input);
    }

    throw new ByokPublicError(BYOK_ERROR_CODE.UNSUPPORTED_PROVIDER, 400);
  } catch (error) {
    if (error instanceof ByokPublicError) {
      throw error;
    }

    throw new ByokPublicError(
      BYOK_ERROR_CODE.AI_PROVIDER_UNAVAILABLE,
      503,
      'AI Provider 请求失败：网络连接失败或请求超时。',
    );
  }
}
