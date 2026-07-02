import crypto from 'node:crypto';
import { z } from 'zod';
import {
  BYOK_AUDIT_EVENT,
  BYOK_CREDENTIAL_STATUS,
  BYOK_DEFAULT_TTL_SECONDS,
  BYOK_ENCRYPTION_ALGORITHM,
  BYOK_PAYLOAD_VERSION,
  BYOK_REDIS_KEY_PREFIX,
  BYOK_TTL_OPTION_SECONDS,
  SUPPORTED_BYOK_PROVIDERS,
  type ByokCredentialStatus,
  type ByokProvider,
  type ByokTtlOption,
} from './constants';
import type { EncryptedApiKeyPayload } from './crypto';
import {
  redisDel,
  redisExpire,
  redisGet,
  redisMGet,
  redisSetEx,
  redisTtl,
  redisZAdd,
  redisZRangeByScore,
  redisZRem,
} from '@/lib/server/redis';
import { writeByokAuditEvent } from '@/lib/ai/security/audit';

export interface ByokRedisClient {
  del(key: string): Promise<void>;
  expire(key: string, seconds: number): Promise<void>;
  get(key: string): Promise<string | null>;
  mGet(keys: string[]): Promise<Array<string | null>>;
  setEx(key: string, seconds: number, value: string): Promise<void>;
  ttl(key: string): Promise<number>;
  zAdd(key: string, score: number, member: string): Promise<void>;
  zRangeByScore(key: string, min: number | string, max: number | string): Promise<string[]>;
  zRem(key: string, member: string): Promise<void>;
}

export interface StoredCredentialStatus {
  credentialId: string;
  provider: ByokProvider;
  label: string;
  keyHint: string;
  expiresAt: string;
  lastUsedAt?: string;
  remainingSeconds: number;
  status: ByokCredentialStatus;
}

const encryptedPayloadSchema = z.object({
  version: z.literal(BYOK_PAYLOAD_VERSION),
  credentialId: z.string().regex(/^cred_[a-f0-9]{32}$/u),
  provider: z.enum(SUPPORTED_BYOK_PROVIDERS),
  label: z.string().min(1).max(80),
  algorithm: z.literal(BYOK_ENCRYPTION_ALGORITHM),
  keyVersion: z.string().min(1),
  ciphertext: z.string().min(1),
  iv: z.string().min(1),
  authTag: z.string().min(1),
  keyHint: z.string().min(1),
  createdAt: z.string().min(1),
  expiresAt: z.string().min(1),
  lastUsedAt: z.string().min(1).optional(),
  status: z.enum([
    BYOK_CREDENTIAL_STATUS.ACTIVE,
    BYOK_CREDENTIAL_STATUS.INVALID,
    BYOK_CREDENTIAL_STATUS.EXPIRED,
    BYOK_CREDENTIAL_STATUS.DISABLED,
  ]),
});

const defaultRedisClient: ByokRedisClient = {
  del: redisDel,
  expire: redisExpire,
  get: redisGet,
  mGet: redisMGet,
  setEx: redisSetEx,
  ttl: redisTtl,
  zAdd: redisZAdd,
  zRangeByScore: redisZRangeByScore,
  zRem: redisZRem,
};

function getRedisIdSecret(): string {
  const secret = process.env.AI_KEY_REDIS_ID_SECRET;

  if (!secret || secret.length < 16) {
    throw new Error('AI_KEY_REDIS_ID_SECRET 未配置或长度不足');
  }

  if (secret === process.env.AI_KEY_ENCRYPTION_KEY_V1) {
    throw new Error('AI_KEY_REDIS_ID_SECRET 不能与 AI_KEY_ENCRYPTION_KEY_V1 共用');
  }

  return secret;
}

function getMaxIndexTtlSeconds(): number {
  return Math.max(...Object.values(BYOK_TTL_OPTION_SECONDS));
}

export function createCredentialId(): string {
  return `cred_${crypto.randomUUID().replaceAll('-', '')}`;
}

export function getByokTtlSeconds(ttlOption?: ByokTtlOption): number {
  return ttlOption ? BYOK_TTL_OPTION_SECONDS[ttlOption] : BYOK_DEFAULT_TTL_SECONDS;
}

export function createByokUserHash(userId: string): string {
  return crypto.createHmac('sha256', getRedisIdSecret()).update(userId).digest('hex');
}

export function createByokCredentialRedisKey(userId: string, credentialId: string): string {
  return `${BYOK_REDIS_KEY_PREFIX}:${createByokUserHash(userId)}:${credentialId}`;
}

export function createByokCredentialIndexKey(userId: string): string {
  return `ai:byok:index:${createByokUserHash(userId)}`;
}

function getCredentialExpiresAt(ttlSeconds: number): string {
  return new Date(Date.now() + ttlSeconds * 1000).toISOString();
}

function toCredentialStatus(
  payload: EncryptedApiKeyPayload,
  remainingSeconds: number,
): StoredCredentialStatus {
  return {
    credentialId: payload.credentialId,
    provider: payload.provider,
    label: payload.label,
    keyHint: payload.keyHint,
    expiresAt: payload.expiresAt || getCredentialExpiresAt(remainingSeconds),
    lastUsedAt: payload.lastUsedAt,
    remainingSeconds,
    status: payload.status,
  };
}

export function buildCredentialExpiry(ttlOption?: ByokTtlOption): {
  expiresAt: string;
  ttlSeconds: number;
} {
  const ttlSeconds = getByokTtlSeconds(ttlOption);

  return {
    expiresAt: getCredentialExpiresAt(ttlSeconds),
    ttlSeconds,
  };
}

export async function saveStoredApiCredential(
  userId: string,
  payload: EncryptedApiKeyPayload,
  ttlSeconds: number,
  client: ByokRedisClient = defaultRedisClient,
): Promise<StoredCredentialStatus> {
  const redisKey = createByokCredentialRedisKey(userId, payload.credentialId);
  const indexKey = createByokCredentialIndexKey(userId);
  const expiresAtScore = Math.floor(Date.parse(payload.expiresAt) / 1000);

  await client.setEx(redisKey, ttlSeconds, JSON.stringify(payload));
  await client.zAdd(indexKey, expiresAtScore, payload.credentialId);
  await client.expire(indexKey, getMaxIndexTtlSeconds());

  return toCredentialStatus(payload, ttlSeconds);
}

export async function getStoredApiCredential(
  userId: string,
  credentialId: string,
  client: ByokRedisClient = defaultRedisClient,
): Promise<{ payload: EncryptedApiKeyPayload; remainingSeconds: number } | null> {
  const redisKey = createByokCredentialRedisKey(userId, credentialId);
  const ttl = await client.ttl(redisKey);

  if (ttl === -2) {
    return null;
  }

  if (ttl === -1) {
    await client.del(redisKey);
    await client.zRem(createByokCredentialIndexKey(userId), credentialId);
    writeByokAuditEvent({
      eventType: BYOK_AUDIT_EVENT.KEY_TTL_MISSING_REMOVED,
      actorId: userId,
      result: 'failed',
      reasonCode: 'TTL_MISSING',
    });
    return null;
  }

  const raw = await client.get(redisKey);

  if (!raw) {
    await client.zRem(createByokCredentialIndexKey(userId), credentialId);
    return null;
  }

  const payload = encryptedPayloadSchema.parse(JSON.parse(raw));

  if (payload.credentialId !== credentialId) {
    await client.del(redisKey);
    await client.zRem(createByokCredentialIndexKey(userId), credentialId);
    return null;
  }

  return { payload, remainingSeconds: ttl };
}

export async function listStoredApiCredentials(
  userId: string,
  client: ByokRedisClient = defaultRedisClient,
): Promise<StoredCredentialStatus[]> {
  const indexKey = createByokCredentialIndexKey(userId);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const credentialIds = await client.zRangeByScore(indexKey, nowSeconds, '+inf');
  const redisKeys = credentialIds.map((credentialId) =>
    createByokCredentialRedisKey(userId, credentialId),
  );
  const rawValues = await client.mGet(redisKeys);
  const statuses: StoredCredentialStatus[] = [];

  for (let index = 0; index < credentialIds.length; index += 1) {
    const credentialId = credentialIds[index];
    const redisKey = redisKeys[index];
    const raw = rawValues[index];
    const ttl = await client.ttl(redisKey);

    if (ttl === -2 || !raw) {
      await client.zRem(indexKey, credentialId);
      continue;
    }

    if (ttl === -1) {
      await client.del(redisKey);
      await client.zRem(indexKey, credentialId);
      writeByokAuditEvent({
        eventType: BYOK_AUDIT_EVENT.KEY_TTL_MISSING_REMOVED,
        actorId: userId,
        result: 'failed',
        reasonCode: 'TTL_MISSING',
      });
      continue;
    }

    const payload = encryptedPayloadSchema.parse(JSON.parse(raw));

    if (payload.credentialId !== credentialId) {
      await client.del(redisKey);
      await client.zRem(indexKey, credentialId);
      continue;
    }

    statuses.push(toCredentialStatus(payload, ttl));
  }

  return statuses;
}

export async function deleteStoredApiCredential(
  userId: string,
  credentialId: string,
  client: ByokRedisClient = defaultRedisClient,
): Promise<void> {
  await client.del(createByokCredentialRedisKey(userId, credentialId));
  await client.zRem(createByokCredentialIndexKey(userId), credentialId);
}

export async function touchStoredApiCredentialLastUsed(
  userId: string,
  payload: EncryptedApiKeyPayload,
  remainingSeconds: number,
  client: ByokRedisClient = defaultRedisClient,
): Promise<void> {
  if (remainingSeconds <= 0) {
    return;
  }

  await client.setEx(
    createByokCredentialRedisKey(userId, payload.credentialId),
    remainingSeconds,
    JSON.stringify({
      ...payload,
      lastUsedAt: new Date().toISOString(),
    }),
  );
}
