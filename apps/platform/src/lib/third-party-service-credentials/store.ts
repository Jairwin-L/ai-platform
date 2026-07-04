import crypto from 'node:crypto';
import { z } from 'zod';
import {
  CREDENTIAL_ENCRYPTION_ALGORITHM,
  CREDENTIAL_INDEX_REDIS_KEY_PREFIX,
  CREDENTIAL_PAYLOAD_VERSION,
  CREDENTIAL_REDIS_KEY_PREFIX,
  CREDENTIAL_STATUS,
  DEFAULT_TTL_SECONDS,
  TTL_OPTION_SECONDS,
  type CredentialTtlOption,
} from './constants';
import type { EncryptedCredentialPayload } from './crypto';
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

export type CredentialRedisClient = IThirdPartyServiceCredentials.RedisClient;
export type StoredCredentialStatus = IThirdPartyServiceCredentials.StoredCredentialStatus;

const encryptedPayloadSchema = z.object({
  algorithm: z.literal(CREDENTIAL_ENCRYPTION_ALGORITHM),
  authTag: z.string().min(1),
  ciphertext: z.string().min(1),
  createdAt: z.string().min(1),
  credentialId: z.string().regex(/^cred_[a-f0-9]{32}$/u),
  expiresAt: z.string().min(1),
  iv: z.string().min(1),
  keyHint: z.string().min(1),
  keyVersion: z.string().min(1),
  label: z.string().min(1).max(80),
  lastUsedAt: z.string().min(1).optional(),
  serviceName: z.string().min(1).max(80),
  status: z.enum([
    CREDENTIAL_STATUS.ACTIVE,
    CREDENTIAL_STATUS.INVALID,
    CREDENTIAL_STATUS.EXPIRED,
    CREDENTIAL_STATUS.DISABLED,
  ]),
  version: z.literal(CREDENTIAL_PAYLOAD_VERSION),
});

const defaultRedisClient: CredentialRedisClient = {
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
  return Math.max(...Object.values(TTL_OPTION_SECONDS));
}

function getCredentialExpiresAt(ttlSeconds: number): string {
  return new Date(Date.now() + ttlSeconds * 1000).toISOString();
}

function createUserHash(userId: string): string {
  return crypto.createHmac('sha256', getRedisIdSecret()).update(userId).digest('hex');
}

function createCredentialRedisKey(userId: string, credentialId: string): string {
  return `${CREDENTIAL_REDIS_KEY_PREFIX}:${createUserHash(userId)}:${credentialId}`;
}

function createCredentialIndexKey(userId: string): string {
  return `${CREDENTIAL_INDEX_REDIS_KEY_PREFIX}:${createUserHash(userId)}`;
}

function toCredentialStatus(
  payload: EncryptedCredentialPayload,
  remainingSeconds: number,
): StoredCredentialStatus {
  return {
    credentialId: payload.credentialId,
    expiresAt: payload.expiresAt || getCredentialExpiresAt(remainingSeconds),
    keyHint: payload.keyHint,
    label: payload.label,
    lastUsedAt: payload.lastUsedAt,
    remainingSeconds,
    serviceName: payload.serviceName,
    status: payload.status,
  };
}

async function ensureSettledTasks(tasks: Array<Promise<unknown>>): Promise<void> {
  const results = await Promise.allSettled(tasks);

  for (const result of results) {
    if (result.status === 'fulfilled') {
      continue;
    }

    throw result.reason;
  }
}

export function createCredentialId(): string {
  return `cred_${crypto.randomUUID().replaceAll('-', '')}`;
}

export function getTtlSeconds(ttlOption?: CredentialTtlOption): number {
  return ttlOption ? TTL_OPTION_SECONDS[ttlOption] : DEFAULT_TTL_SECONDS;
}

export function buildCredentialExpiry(ttlOption?: CredentialTtlOption): {
  expiresAt: string;
  ttlSeconds: number;
} {
  const ttlSeconds = getTtlSeconds(ttlOption);

  return {
    expiresAt: getCredentialExpiresAt(ttlSeconds),
    ttlSeconds,
  };
}

export async function saveStoredCredential(
  userId: string,
  payload: EncryptedCredentialPayload,
  ttlSeconds: number,
  client: CredentialRedisClient = defaultRedisClient,
): Promise<StoredCredentialStatus> {
  const redisKey = createCredentialRedisKey(userId, payload.credentialId);
  const indexKey = createCredentialIndexKey(userId);
  const expiresAtScore = Math.floor(Date.parse(payload.expiresAt) / 1000);

  await client.setEx(redisKey, ttlSeconds, JSON.stringify(payload));
  await client.zAdd(indexKey, expiresAtScore, payload.credentialId);
  await client.expire(indexKey, getMaxIndexTtlSeconds());

  return toCredentialStatus(payload, ttlSeconds);
}

export async function listStoredCredentials(
  userId: string,
  client: CredentialRedisClient = defaultRedisClient,
): Promise<StoredCredentialStatus[]> {
  const indexKey = createCredentialIndexKey(userId);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const credentialIds = await client.zRangeByScore(indexKey, nowSeconds, '+inf');

  if (!credentialIds.length) {
    return [];
  }

  const redisKeys = credentialIds.map((credentialId) =>
    createCredentialRedisKey(userId, credentialId),
  );
  const rawValues = await client.mGet(redisKeys);
  const statusResults = await Promise.allSettled(
    credentialIds.map(async (credentialId, index) => {
      const redisKey = redisKeys[index];
      const raw = rawValues[index];
      const ttl = await client.ttl(redisKey);

      if (ttl === -2 || !raw) {
        await client.zRem(indexKey, credentialId);
        return null;
      }

      if (ttl === -1) {
        await ensureSettledTasks([client.del(redisKey), client.zRem(indexKey, credentialId)]);
        return null;
      }

      const payload = encryptedPayloadSchema.parse(JSON.parse(raw));

      if (payload.credentialId !== credentialId) {
        await ensureSettledTasks([client.del(redisKey), client.zRem(indexKey, credentialId)]);
        return null;
      }

      return toCredentialStatus(payload, ttl);
    }),
  );
  const failedStatus = statusResults.find((result) => result.status === 'rejected');

  if (failedStatus?.status === 'rejected') {
    throw failedStatus.reason;
  }

  return statusResults.flatMap((result) =>
    result.status === 'fulfilled' && result.value ? [result.value] : [],
  );
}

export async function deleteStoredCredential(
  userId: string,
  credentialId: string,
  client: CredentialRedisClient = defaultRedisClient,
): Promise<void> {
  await client.del(createCredentialRedisKey(userId, credentialId));
  await client.zRem(createCredentialIndexKey(userId), credentialId);
}
