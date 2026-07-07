import { describe, expect, it, vi } from 'vite-plus/test';
import { BYOK_ERROR_CODE } from '@/lib/ai/byok/constants';
import type { EncryptedApiKeyPayload } from '@/lib/ai/byok/crypto';
import { ByokPublicError } from '@/lib/ai/byok/errors';
import {
  createByokChatCompletion,
  listUserApiCredentials,
  saveUserApiCredential,
  updateUserDefaultModelConfig,
} from '@/lib/ai/byok/service';
import type { ChatRequestInput } from '@/lib/ai/byok/schemas';

const CREDENTIAL_ID = 'cred_11111111111111111111111111111111';
const PAYLOAD: EncryptedApiKeyPayload = {
  version: 1,
  credentialId: CREDENTIAL_ID,
  provider: 'test-provider',
  label: 'Test provider main',
  algorithm: 'aes-256-gcm',
  keyVersion: 'v1',
  ciphertext: 'Y2lwaGVydGV4dA==',
  iv: 'aXY=',
  authTag: 'dGFn',
  keyHint: 'sk-****7890',
  createdAt: '2026-07-02T00:00:00.000Z',
  expiresAt: '2026-07-09T00:00:00.000Z',
  status: 'active',
};

const CHAT_INPUT: ChatRequestInput = {
  credentialId: CREDENTIAL_ID,
  model: 'test-model',
  messages: [{ role: 'user' as const, content: 'hello' }],
};

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

describe('BYOK service', () => {
  const apiKey = ['sk', 'test', 'secret'].join('-');

  it('rejects invalid key format before encryption or storage', async () => {
    const encryptApiKey = vi.fn();
    const saveStoredApiCredential = vi.fn();

    await expect(
      saveUserApiCredential(
        'user-1',
        {
          provider: 'test-provider',
          label: 'Test provider main',
          apiKey: 'bad key',
          ttlOption: '7d',
        },
        {},
        {
          encryptApiKey,
          saveStoredApiCredential,
        },
      ),
    ).rejects.toMatchObject({ code: BYOK_ERROR_CODE.INVALID_REQUEST });

    expect(encryptApiKey).not.toHaveBeenCalled();
    expect(saveStoredApiCredential).not.toHaveBeenCalled();
  });

  it('does not decrypt when listing credentials', async () => {
    const decryptApiKey = vi.fn(async () => apiKey);

    const status = await listUserApiCredentials('user-1', {
      decryptApiKey,
      listStoredApiCredentials: async () => [
        {
          credentialId: CREDENTIAL_ID,
          provider: 'test-provider',
          label: 'Test provider main',
          keyHint: 'sk-****7890',
          expiresAt: '2026-07-09T00:00:00.000Z',
          remainingSeconds: 604800,
          status: 'active',
        },
      ],
    });

    expect(status.credentials).toHaveLength(1);
    expect(decryptApiKey).not.toHaveBeenCalled();
  });

  it('auto-removes the selected credential when provider authentication fails', async () => {
    const deleteStoredApiCredential = vi.fn(async () => undefined);

    await expect(
      createByokChatCompletion(
        'user-1',
        CHAT_INPUT,
        {},
        {
          getStoredApiCredential: async () => ({ payload: PAYLOAD, remainingSeconds: 604800 }),
          getStoredAiProviderOptions: async () => [PROVIDER_OPTION],
          decryptApiKey: async () => apiKey,
          callAiProvider: async () => {
            throw new ByokPublicError(BYOK_ERROR_CODE.BYOK_KEY_INVALID, 401);
          },
          deleteStoredApiCredential,
        },
      ),
    ).rejects.toMatchObject({ code: BYOK_ERROR_CODE.BYOK_KEY_INVALID });

    expect(deleteStoredApiCredential).toHaveBeenCalledWith('user-1', CREDENTIAL_ID);
  });

  it('keeps the credential when provider rate limits or is unavailable', async () => {
    const deleteStoredApiCredential = vi.fn(async () => undefined);

    await expect(
      createByokChatCompletion(
        'user-1',
        CHAT_INPUT,
        {},
        {
          getStoredApiCredential: async () => ({ payload: PAYLOAD, remainingSeconds: 604800 }),
          getStoredAiProviderOptions: async () => [PROVIDER_OPTION],
          decryptApiKey: async () => apiKey,
          callAiProvider: async () => {
            throw new ByokPublicError(BYOK_ERROR_CODE.RATE_LIMITED, 429);
          },
          deleteStoredApiCredential,
        },
      ),
    ).rejects.toMatchObject({ code: BYOK_ERROR_CODE.RATE_LIMITED });

    await expect(
      createByokChatCompletion(
        'user-1',
        CHAT_INPUT,
        {},
        {
          getStoredApiCredential: async () => ({ payload: PAYLOAD, remainingSeconds: 604800 }),
          getStoredAiProviderOptions: async () => [PROVIDER_OPTION],
          decryptApiKey: async () => apiKey,
          callAiProvider: async () => {
            throw new ByokPublicError(BYOK_ERROR_CODE.AI_PROVIDER_UNAVAILABLE, 503);
          },
          deleteStoredApiCredential,
        },
      ),
    ).rejects.toMatchObject({ code: BYOK_ERROR_CODE.AI_PROVIDER_UNAVAILABLE });

    expect(deleteStoredApiCredential).not.toHaveBeenCalled();
  });

  it('updates the default model config for an active supported credential', async () => {
    const saveStoredDefaultModelConfig = vi.fn(
      async (_userId: string, input: IByok.DefaultModelConfig) => input,
    );

    await expect(
      updateUserDefaultModelConfig(
        'user-1',
        { credentialId: CREDENTIAL_ID, modelId: 'test-model' },
        {
          listStoredApiCredentials: async () => [
            {
              credentialId: CREDENTIAL_ID,
              provider: 'test-provider',
              label: 'Test provider main',
              keyHint: 'sk-****7890',
              expiresAt: '2026-07-09T00:00:00.000Z',
              remainingSeconds: 604800,
              status: 'active',
            },
          ],
          getStoredAiProviderOptions: async () => [PROVIDER_OPTION],
          saveStoredDefaultModelConfig,
        },
      ),
    ).resolves.toEqual({ credentialId: CREDENTIAL_ID, modelId: 'test-model' });

    expect(saveStoredDefaultModelConfig).toHaveBeenCalledTimes(1);
  });

  it('rejects default model config when the model is not supported', async () => {
    const saveStoredDefaultModelConfig = vi.fn();

    await expect(
      updateUserDefaultModelConfig(
        'user-1',
        { credentialId: CREDENTIAL_ID, modelId: 'other-model' },
        {
          listStoredApiCredentials: async () => [
            {
              credentialId: CREDENTIAL_ID,
              provider: 'test-provider',
              label: 'Test provider main',
              keyHint: 'sk-****7890',
              expiresAt: '2026-07-09T00:00:00.000Z',
              remainingSeconds: 604800,
              status: 'active',
            },
          ],
          getStoredAiProviderOptions: async () => [PROVIDER_OPTION],
          saveStoredDefaultModelConfig,
        },
      ),
    ).rejects.toMatchObject({ code: BYOK_ERROR_CODE.UNSUPPORTED_PROVIDER });

    expect(saveStoredDefaultModelConfig).not.toHaveBeenCalled();
  });
});
