import {
  ANTHROPIC_MESSAGES_URL,
  ANTHROPIC_VERSION,
  BYOK_ALLOWED_MODELS_BY_PROVIDER,
  BYOK_CHAT_LIMITS,
  BYOK_ERROR_CODE,
  BYOK_PROVIDER,
  DEEPSEEK_CHAT_COMPLETIONS_URL,
  GEMINI_GENERATE_CONTENT_URL_PREFIX,
  OPENAI_CHAT_COMPLETIONS_URL,
  type ByokProvider,
} from './constants';
import { ByokPublicError } from './errors';
import type { ChatRequestInput } from './schemas';

export type ChatCompletionResult = IByok.ChatCompletionResult;

export class ProviderAuthenticationError extends Error {
  constructor() {
    super('Provider authentication failed');
    this.name = 'ProviderAuthenticationError';
  }
}

type AnthropicResponse = IByok.AnthropicResponse;
type GeminiResponse = IByok.GeminiResponse;
type OpenAiCompatibleResponse = IByok.OpenAiCompatibleResponse;
type ProviderErrorPayload = IByok.ProviderErrorPayload;

function isModelAllowed(provider: ByokProvider, model: string): boolean {
  return (BYOK_ALLOWED_MODELS_BY_PROVIDER[provider] as readonly string[]).includes(model);
}

function hasWhitespaceOrControlCharacter(value: string): boolean {
  return Array.from(value).some((char) => {
    const code = char.charCodeAt(0);

    return char.trim() === '' || code <= 31 || code === 127;
  });
}

export function validateProviderApiKey(provider: ByokProvider, apiKey: string): boolean {
  if (!apiKey || apiKey.trim() !== apiKey || hasWhitespaceOrControlCharacter(apiKey)) {
    return false;
  }

  if (provider === BYOK_PROVIDER.OPENAI) {
    return apiKey.startsWith('sk-');
  }

  if (provider === BYOK_PROVIDER.ANTHROPIC) {
    return apiKey.startsWith('sk-ant-');
  }

  if (provider === BYOK_PROVIDER.GEMINI) {
    return apiKey.length >= 16;
  }

  if (provider === BYOK_PROVIDER.DEEPSEEK) {
    return apiKey.startsWith('sk-');
  }

  return false;
}

async function getProviderErrorPayload(response: Response): Promise<ProviderErrorPayload | null> {
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.toLowerCase().includes('application/json')) {
    return null;
  }

  try {
    const value = (await response.json()) as unknown;

    return typeof value === 'object' && value !== null ? (value as ProviderErrorPayload) : null;
  } catch {
    return null;
  }
}

function getErrorText(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

function isProviderAuthenticationFailure(
  response: Response,
  payload: ProviderErrorPayload | null,
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

function toProviderUnavailableError(response: Response): ByokPublicError {
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
    throw new ProviderAuthenticationError();
  }

  throw toProviderUnavailableError(response);
}

function getOpenAiCompatibleContent(data: unknown): string | null {
  const value = data as OpenAiCompatibleResponse;

  return value.choices?.[0]?.message?.content ?? null;
}

function getAnthropicContent(data: unknown): string | null {
  const value = data as AnthropicResponse;

  return value.content
    ?.filter((part) => part.type === 'text' || typeof part.text === 'string')
    .map((part) => part.text || '')
    .join('') ?? null;
}

function getGeminiContent(data: unknown): string | null {
  const value = data as GeminiResponse;

  return value.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') ?? null;
}

function buildAnthropicBody(input: ChatRequestInput) {
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

function buildGeminiBody(input: ChatRequestInput) {
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

async function callOpenAiCompatibleProvider(
  apiKey: string,
  provider: ByokProvider,
  input: ChatRequestInput,
  url: string,
): Promise<ChatCompletionResult> {
  const response = await fetchWithTimeout(url, {
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
  const content = getOpenAiCompatibleContent(data);

  if (content === null) {
    throw new ByokPublicError(BYOK_ERROR_CODE.AI_PROVIDER_UNAVAILABLE, 503);
  }

  return { provider, model: input.model, content };
}

async function callAnthropicProvider(
  apiKey: string,
  input: ChatRequestInput,
): Promise<ChatCompletionResult> {
  const response = await fetchWithTimeout(ANTHROPIC_MESSAGES_URL, {
    method: 'POST',
    headers: {
      'anthropic-version': ANTHROPIC_VERSION,
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(buildAnthropicBody(input)),
  });

  await assertProviderResponseOk(response);
  const data = (await response.json()) as unknown;
  const content = getAnthropicContent(data);

  if (content === null) {
    throw new ByokPublicError(BYOK_ERROR_CODE.AI_PROVIDER_UNAVAILABLE, 503);
  }

  return { provider: BYOK_PROVIDER.ANTHROPIC, model: input.model, content };
}

async function callGeminiProvider(
  apiKey: string,
  input: ChatRequestInput,
): Promise<ChatCompletionResult> {
  const response = await fetchWithTimeout(
    `${GEMINI_GENERATE_CONTENT_URL_PREFIX}/${encodeURIComponent(input.model)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(buildGeminiBody(input)),
    },
  );

  await assertProviderResponseOk(response);
  const data = (await response.json()) as unknown;
  const content = getGeminiContent(data);

  if (content === null) {
    throw new ByokPublicError(BYOK_ERROR_CODE.AI_PROVIDER_UNAVAILABLE, 503);
  }

  return { provider: BYOK_PROVIDER.GEMINI, model: input.model, content };
}

export async function callAiProvider(
  apiKey: string,
  provider: ByokProvider,
  input: ChatRequestInput,
): Promise<ChatCompletionResult> {
  if (!isModelAllowed(provider, input.model)) {
    throw new ByokPublicError(BYOK_ERROR_CODE.INVALID_REQUEST, 400);
  }

  try {
    if (provider === BYOK_PROVIDER.OPENAI) {
      return await callOpenAiCompatibleProvider(
        apiKey,
        provider,
        input,
        OPENAI_CHAT_COMPLETIONS_URL,
      );
    }

    if (provider === BYOK_PROVIDER.ANTHROPIC) {
      return await callAnthropicProvider(apiKey, input);
    }

    if (provider === BYOK_PROVIDER.GEMINI) {
      return await callGeminiProvider(apiKey, input);
    }

    if (provider === BYOK_PROVIDER.DEEPSEEK) {
      return await callOpenAiCompatibleProvider(
        apiKey,
        provider,
        input,
        DEEPSEEK_CHAT_COMPLETIONS_URL,
      );
    }

    throw new ByokPublicError(BYOK_ERROR_CODE.UNSUPPORTED_PROVIDER, 400);
  } catch (error) {
    if (error instanceof ProviderAuthenticationError || error instanceof ByokPublicError) {
      throw error;
    }

    throw new ByokPublicError(BYOK_ERROR_CODE.AI_PROVIDER_UNAVAILABLE, 503);
  }
}
