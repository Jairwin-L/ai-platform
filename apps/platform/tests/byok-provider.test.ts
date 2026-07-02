import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { BYOK_ERROR_CODE } from '@/lib/ai/byok/constants';
import {
  ProviderAuthenticationError,
  callAiProvider,
  validateProviderApiKey,
} from '@/lib/ai/byok/provider';
import type { ChatRequestInput } from '@/lib/ai/byok/schemas';

const API_KEY = ['sk', 'test', 'secret'].join('-');
const CHAT_INPUT: ChatRequestInput = {
  credentialId: 'cred_11111111111111111111111111111111',
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'hello' }],
};

function mockFetchResponse(response: Response): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => response),
  );
}

describe('BYOK provider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps explicit provider authentication failures to ProviderAuthenticationError', async () => {
    mockFetchResponse(
      Response.json(
        {
          error: {
            code: 'invalid_api_key',
            message: 'Incorrect API key provided.',
            type: 'invalid_request_error',
          },
        },
        { status: 400 },
      ),
    );

    await expect(callAiProvider(API_KEY, 'openai', CHAT_INPUT)).rejects.toBeInstanceOf(
      ProviderAuthenticationError,
    );
  });

  it('maps provider rate limit and server errors without treating them as invalid keys', async () => {
    mockFetchResponse(Response.json({ error: { type: 'rate_limit_error' } }, { status: 429 }));

    await expect(callAiProvider(API_KEY, 'openai', CHAT_INPUT)).rejects.toMatchObject({
      code: BYOK_ERROR_CODE.RATE_LIMITED,
      status: 429,
    });

    mockFetchResponse(Response.json({ error: { type: 'server_error' } }, { status: 500 }));

    await expect(callAiProvider(API_KEY, 'openai', CHAT_INPUT)).rejects.toMatchObject({
      code: BYOK_ERROR_CODE.AI_PROVIDER_UNAVAILABLE,
      status: 503,
    });
  });

  it('maps network failures to provider unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network failure');
      }),
    );

    await expect(callAiProvider(API_KEY, 'openai', CHAT_INPUT)).rejects.toMatchObject({
      code: BYOK_ERROR_CODE.AI_PROVIDER_UNAVAILABLE,
      status: 503,
    });
  });

  it('rejects models that do not belong to the credential provider', async () => {
    await expect(callAiProvider(API_KEY, 'anthropic', CHAT_INPUT)).rejects.toMatchObject({
      code: BYOK_ERROR_CODE.INVALID_REQUEST,
      status: 400,
    });
  });

  it('validates provider-specific api key formats before storage', () => {
    expect(validateProviderApiKey('openai', ['sk', 'test', 'secret'].join('-'))).toBe(true);
    expect(validateProviderApiKey('anthropic', ['sk', 'ant', 'test'].join('-'))).toBe(true);
    expect(validateProviderApiKey('gemini', 'AIzaSyExampleKey')).toBe(true);
    expect(validateProviderApiKey('deepseek', ['sk', 'deepseek', 'test'].join('-'))).toBe(true);
    expect(validateProviderApiKey('openai', 'AIzaSyExampleKey')).toBe(false);
    expect(validateProviderApiKey('gemini', 'short')).toBe(false);
  });
});
