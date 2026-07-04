import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { BYOK_ERROR_CODE } from '@/lib/ai/byok/constants';
import { callAiProvider, validateProviderApiKey } from '@/lib/ai/byok/provider';
import type { ChatRequestInput } from '@/lib/ai/byok/schemas';

const API_KEY = ['sk', 'test', 'secret'].join('-');
const PROVIDER_OPTION: IByok.AiProviderOption = {
  value: 'test-provider',
  label: 'Test Provider',
  color: 'blue',
  apiKeyUrl: 'https://provider.example/keys',
  protocol: 'chat-completions',
  chatBaseUrl: 'https://provider.example/v1/chat/completions',
  models: ['test-model'],
  enabled: true,
};
const CHAT_INPUT: ChatRequestInput = {
  credentialId: 'cred_11111111111111111111111111111111',
  model: 'test-model',
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

  it('maps explicit provider authentication failures to invalid BYOK key errors', async () => {
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

    await expect(callAiProvider(API_KEY, PROVIDER_OPTION, CHAT_INPUT)).rejects.toMatchObject({
      code: BYOK_ERROR_CODE.BYOK_KEY_INVALID,
      status: 401,
    });
  });

  it('maps provider rate limit and server errors without treating them as invalid keys', async () => {
    mockFetchResponse(Response.json({ error: { type: 'rate_limit_error' } }, { status: 429 }));

    await expect(callAiProvider(API_KEY, PROVIDER_OPTION, CHAT_INPUT)).rejects.toMatchObject({
      code: BYOK_ERROR_CODE.RATE_LIMITED,
      status: 429,
    });

    mockFetchResponse(Response.json({ error: { type: 'server_error' } }, { status: 500 }));

    await expect(callAiProvider(API_KEY, PROVIDER_OPTION, CHAT_INPUT)).rejects.toMatchObject({
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

    await expect(callAiProvider(API_KEY, PROVIDER_OPTION, CHAT_INPUT)).rejects.toMatchObject({
      code: BYOK_ERROR_CODE.AI_PROVIDER_UNAVAILABLE,
      status: 503,
    });
  });

  it('rejects models that are not configured for the credential provider', async () => {
    await expect(
      callAiProvider(API_KEY, { ...PROVIDER_OPTION, models: ['other-model'] }, CHAT_INPUT),
    ).rejects.toMatchObject({
      code: BYOK_ERROR_CODE.INVALID_REQUEST,
      status: 400,
    });
  });

  it('validates generic api key formatting before storage', () => {
    expect(validateProviderApiKey('test-provider', ['sk', 'test', 'secret'].join('-'))).toBe(true);
    expect(validateProviderApiKey('test-provider', 'AIzaSyExampleKey')).toBe(true);
    expect(validateProviderApiKey('test-provider', ' leading')).toBe(false);
    expect(validateProviderApiKey('test-provider', 'has whitespace')).toBe(false);
  });
});
