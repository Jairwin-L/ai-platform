import { describe, expect, it } from 'vite-plus/test';
import { createKeyHint, decryptApiKey, encryptApiKey } from '@/lib/ai/byok/crypto';
import type { EncryptionKeyProvider } from '@/lib/ai/byok/encryption-key-provider';

const API_KEY = ['sk', 'test', 'secret', '1234567890'].join('-');
const KEY_V1 = Buffer.alloc(32, 1);

class TestKeyProvider implements EncryptionKeyProvider {
  async getActiveKey() {
    return { version: 'v1', key: KEY_V1 };
  }

  async getKeyByVersion(version: string) {
    if (version !== 'v1') {
      throw new Error('unsupported key version');
    }

    return KEY_V1;
  }
}

function tamperBase64(value: string): string {
  const buffer = Buffer.from(value, 'base64');
  buffer[0] ^= 1;
  return buffer.toString('base64');
}

describe('BYOK crypto', () => {
  it('creates masked key hints without exposing short non-OpenAI keys', () => {
    expect(createKeyHint(['sk', 'test', 'secret', '1234'].join('-'))).toBe('sk-****1234');
    expect(createKeyHint('abcdefgh')).toBe('key-****efgh');
  });

  it('uses a fresh iv and ciphertext for repeated encryption', async () => {
    const provider = new TestKeyProvider();
    const context = {
      userId: 'user-1',
      provider: 'openai' as const,
      credentialId: 'cred_11111111111111111111111111111111',
    };
    const metadata = {
      label: 'OpenAI main',
      expiresAt: '2026-07-09T00:00:00.000Z',
    };
    const first = await encryptApiKey(API_KEY, context, metadata, provider);
    const second = await encryptApiKey(API_KEY, context, metadata, provider);

    expect(first.iv).not.toBe(second.iv);
    expect(first.ciphertext).not.toBe(second.ciphertext);
    expect(first.credentialId).toBe(context.credentialId);
    expect(first.label).toBe(metadata.label);
    expect(JSON.stringify(first).includes(API_KEY)).toBe(false);
  });

  it('decrypts only with the original key, aad and payload', async () => {
    const provider = new TestKeyProvider();
    const context = {
      userId: 'user-1',
      provider: 'openai' as const,
      credentialId: 'cred_11111111111111111111111111111111',
    };
    const metadata = {
      label: 'OpenAI main',
      expiresAt: '2026-07-09T00:00:00.000Z',
    };
    const payload = await encryptApiKey(API_KEY, context, metadata, provider);

    await expect(decryptApiKey(payload, context, provider)).resolves.toBe(API_KEY);
    await expect(
      decryptApiKey(
        { ...payload, ciphertext: tamperBase64(payload.ciphertext) },
        context,
        provider,
      ),
    ).rejects.toThrow();
    await expect(
      decryptApiKey({ ...payload, iv: tamperBase64(payload.iv) }, context, provider),
    ).rejects.toThrow();
    await expect(
      decryptApiKey({ ...payload, authTag: tamperBase64(payload.authTag) }, context, provider),
    ).rejects.toThrow();
    await expect(
      decryptApiKey(payload, { ...context, userId: 'user-2' }, provider),
    ).rejects.toThrow();
    await expect(
      decryptApiKey(
        payload,
        { ...context, provider: 'anthropic' as unknown as 'openai' },
        provider,
      ),
    ).rejects.toThrow();
    await expect(
      decryptApiKey(
        payload,
        { ...context, credentialId: 'cred_22222222222222222222222222222222' },
        provider,
      ),
    ).rejects.toThrow();
    await expect(
      decryptApiKey({ ...payload, keyVersion: 'v2' }, context, provider),
    ).rejects.toThrow();
  });
});
