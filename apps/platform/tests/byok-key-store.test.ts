import { beforeEach, describe, expect, it } from 'vite-plus/test';
import {
  createByokCredentialIndexKey,
  createByokCredentialRedisKey,
  deleteStoredApiCredential,
  listStoredApiCredentials,
  saveStoredApiCredential,
  touchStoredApiCredentialLastUsed,
  type ByokRedisClient,
} from '@/lib/ai/byok/key-store';
import type { EncryptedApiKeyPayload } from '@/lib/ai/byok/crypto';

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
  expiresAt: '2099-07-09T00:00:00.000Z',
  status: 'active',
};

class MemoryRedisClient implements ByokRedisClient {
  values = new Map<string, string>();
  ttls = new Map<string, number>();
  zsets = new Map<string, Map<string, number>>();
  deletedKeys: string[] = [];
  mGetCount = 0;

  async del(key: string) {
    this.values.delete(key);
    this.ttls.delete(key);
    this.deletedKeys.push(key);
  }

  async expire(key: string, seconds: number) {
    this.ttls.set(key, seconds);
  }

  async get(key: string) {
    return this.values.get(key) ?? null;
  }

  async mGet(keys: string[]) {
    this.mGetCount += 1;

    return keys.map((key) => this.values.get(key) ?? null);
  }

  async setEx(key: string, seconds: number, value: string) {
    this.values.set(key, value);
    this.ttls.set(key, seconds);
  }

  async ttl(key: string) {
    return this.ttls.get(key) ?? -2;
  }

  async zAdd(key: string, score: number, member: string) {
    const zset = this.zsets.get(key) ?? new Map<string, number>();
    zset.set(member, score);
    this.zsets.set(key, zset);
  }

  async zRangeByScore(key: string, min: number | string, max: number | string) {
    const minScore = Number(min);
    const maxScore = max === '+inf' ? Number.POSITIVE_INFINITY : Number(max);

    return Array.from(this.zsets.get(key)?.entries() ?? [])
      .filter(([, score]) => score >= minScore && score <= maxScore)
      .sort((left, right) => left[1] - right[1])
      .map(([member]) => member);
  }

  async zRem(key: string, member: string) {
    this.zsets.get(key)?.delete(member);
  }
}

describe('BYOK key store', () => {
  beforeEach(() => {
    process.env.AI_KEY_REDIS_ID_SECRET = 'test-redis-id-secret-with-enough-length';
  });

  it('saves each credential with an isolated ttl and hides raw user id in redis keys', async () => {
    const client = new MemoryRedisClient();
    const result = await saveStoredApiCredential('user-1', PAYLOAD, 604800, client);
    const redisKey = createByokCredentialRedisKey('user-1', CREDENTIAL_ID);
    const indexKey = createByokCredentialIndexKey('user-1');

    expect(result.remainingSeconds).toBe(604800);
    expect(result.credentialId).toBe(CREDENTIAL_ID);
    expect(redisKey).toMatch(/^ai:byok:v1:[a-f0-9]+:cred_/u);
    expect(redisKey).not.toContain('user-1');
    expect(client.ttls.get(redisKey)).toBe(604800);
    expect(client.zsets.get(indexKey)?.has(CREDENTIAL_ID)).toBe(true);
  });

  it('lists credential statuses without exposing encrypted fields', async () => {
    const client = new MemoryRedisClient();
    await saveStoredApiCredential('user-1', PAYLOAD, 604800, client);

    const [status] = await listStoredApiCredentials('user-1', client);
    const serialized = JSON.stringify(status);

    expect(status).toMatchObject({
      credentialId: CREDENTIAL_ID,
      provider: 'test-provider',
      label: 'Test provider main',
      keyHint: 'sk-****7890',
      status: 'active',
    });
    expect(client.mGetCount).toBe(1);
    expect(serialized).not.toContain(PAYLOAD.ciphertext);
    expect(serialized).not.toContain(PAYLOAD.iv);
    expect(serialized).not.toContain(PAYLOAD.authTag);
  });

  it('removes unsafe records without ttl and cleans the user index', async () => {
    const client = new MemoryRedisClient();
    const redisKey = createByokCredentialRedisKey('user-1', CREDENTIAL_ID);
    const indexKey = createByokCredentialIndexKey('user-1');
    client.values.set(redisKey, JSON.stringify(PAYLOAD));
    client.ttls.set(redisKey, -1);
    await client.zAdd(indexKey, Math.floor(Date.parse(PAYLOAD.expiresAt) / 1000), CREDENTIAL_ID);

    const statuses = await listStoredApiCredentials('user-1', client);

    expect(statuses).toEqual([]);
    expect(client.deletedKeys).toContain(redisKey);
    expect(client.zsets.get(indexKey)?.has(CREDENTIAL_ID)).toBe(false);
  });

  it('deletes only the selected credential', async () => {
    const client = new MemoryRedisClient();
    const secondCredentialId = 'cred_22222222222222222222222222222222';
    await saveStoredApiCredential('user-1', PAYLOAD, 604800, client);
    await saveStoredApiCredential(
      'user-1',
      { ...PAYLOAD, credentialId: secondCredentialId, keyHint: 'sk-****9999' },
      604800,
      client,
    );

    await deleteStoredApiCredential('user-1', CREDENTIAL_ID, client);

    expect(client.values.has(createByokCredentialRedisKey('user-1', CREDENTIAL_ID))).toBe(false);
    expect(client.values.has(createByokCredentialRedisKey('user-1', secondCredentialId))).toBe(
      true,
    );
  });

  it('updates lastUsedAt without extending the credential ttl', async () => {
    const client = new MemoryRedisClient();
    await saveStoredApiCredential('user-1', PAYLOAD, 604800, client);
    const redisKey = createByokCredentialRedisKey('user-1', CREDENTIAL_ID);
    client.ttls.set(redisKey, 120);

    await touchStoredApiCredentialLastUsed('user-1', PAYLOAD, 120, client);

    const stored = JSON.parse(client.values.get(redisKey) || '{}') as { lastUsedAt?: string };
    expect(client.ttls.get(redisKey)).toBe(120);
    expect(stored.lastUsedAt).toBeTruthy();
  });

  it('keeps different users isolated in Redis', async () => {
    const client = new MemoryRedisClient();
    const userOneKey = createByokCredentialRedisKey('user-1', CREDENTIAL_ID);
    const userTwoKey = createByokCredentialRedisKey('user-2', CREDENTIAL_ID);

    await saveStoredApiCredential('user-1', PAYLOAD, 604800, client);

    expect(userOneKey).not.toBe(userTwoKey);
    await expect(listStoredApiCredentials('user-2', client)).resolves.toEqual([]);

    await deleteStoredApiCredential('user-2', CREDENTIAL_ID, client);

    expect(client.values.has(userOneKey)).toBe(true);
    expect(client.values.has(userTwoKey)).toBe(false);
  });
});
