import { BYOK_ERROR_CODE } from '@/lib/ai/byok/constants';
import { ByokPublicError } from '@/lib/ai/byok/errors';
import { writeByokAuditEvent } from '@/lib/ai/security/audit';
import { decryptCredential, encryptCredential } from './crypto';
import type { EncryptedCredentialPayload } from './crypto';
import {
  buildCredentialExpiry,
  createCredentialId,
  deleteStoredCredential,
  getStoredCredential,
  listStoredCredentials,
  saveStoredCredential,
  type StoredCredentialStatus,
} from './store';
import { CREDENTIAL_STATUS } from './constants';
import type { OverwriteCredentialInput, SaveCredentialInput } from './schemas';

export type CredentialRequestMeta = IThirdPartyServiceCredentials.RequestMeta;
export type CredentialServiceDependencies = IThirdPartyServiceCredentials.ServiceDependencies;
export type SavedCredentialResult = IThirdPartyServiceCredentials.SavedCredentialResult;

function validateApiKey(apiKey: string): boolean {
  return apiKey.length >= 8 && apiKey.trim() === apiKey && !/\s/u.test(apiKey);
}

export async function saveUserThirdPartyServiceCredential(
  userId: string,
  input: SaveCredentialInput,
  meta: CredentialRequestMeta = {},
  dependencies: CredentialServiceDependencies = {},
): Promise<SavedCredentialResult> {
  const createId = dependencies.createCredentialId ?? createCredentialId;
  const encrypt = dependencies.encryptCredential ?? encryptCredential;
  const listCredentials = dependencies.listStoredCredentials ?? listStoredCredentials;
  const save = dependencies.saveStoredCredential ?? saveStoredCredential;
  const validateKey = dependencies.validateApiKey ?? validateApiKey;

  if (!validateKey(input.apiKey)) {
    throw new ByokPublicError(BYOK_ERROR_CODE.INVALID_REQUEST, 400);
  }

  const existingCredentials = await listCredentials(userId);

  if (existingCredentials.some((credential) => credential.serviceName === input.serviceName)) {
    throw new ByokPublicError(
      BYOK_ERROR_CODE.INVALID_REQUEST,
      400,
      '该第三方服务已保存凭据，请使用覆盖操作更新。',
    );
  }

  const credentialId = createId();
  const expiry = buildCredentialExpiry(input.ttlOption);
  const payload = await encrypt(
    input.apiKey,
    { credentialId, serviceName: input.serviceName, userId },
    { expiresAt: expiry.expiresAt, label: input.label },
  );
  const status = await save(userId, payload, expiry.ttlSeconds);

  writeByokAuditEvent({
    eventType: 'THIRD_PARTY_SERVICE_CREDENTIAL_SAVE_SUCCESS',
    actorId: userId,
    provider: input.serviceName,
    requestId: meta.requestId,
    ip: meta.ip,
    result: 'success',
  });

  return {
    saved: true,
    ...status,
  };
}

export async function listUserThirdPartyServiceCredentials(
  userId: string,
  dependencies: CredentialServiceDependencies = {},
): Promise<{ credentials: StoredCredentialStatus[] }> {
  const listCredentials = dependencies.listStoredCredentials ?? listStoredCredentials;

  return { credentials: await listCredentials(userId) };
}

async function getDecryptedCredential(
  userId: string,
  credentialId: string,
  meta: CredentialRequestMeta,
  dependencies: CredentialServiceDependencies,
): Promise<{
  apiKey: string;
  payload: EncryptedCredentialPayload;
  remainingSeconds: number;
}> {
  const getCredential = dependencies.getStoredCredential ?? getStoredCredential;
  const decrypt = dependencies.decryptCredential ?? decryptCredential;
  const stored = await getCredential(userId, credentialId);

  if (!stored || stored.payload.status !== CREDENTIAL_STATUS.ACTIVE) {
    throw new ByokPublicError(
      BYOK_ERROR_CODE.BYOK_KEY_UNAVAILABLE,
      404,
      '未找到有效的第三方服务 API Key，请先保存凭据。',
    );
  }

  try {
    return {
      apiKey: await decrypt(stored.payload, {
        credentialId,
        serviceName: stored.payload.serviceName,
        userId,
      }),
      payload: stored.payload,
      remainingSeconds: stored.remainingSeconds,
    };
  } catch {
    writeByokAuditEvent({
      eventType: 'THIRD_PARTY_SERVICE_CREDENTIAL_DECRYPT_FAILED',
      actorId: userId,
      provider: stored.payload.serviceName,
      requestId: meta.requestId,
      ip: meta.ip,
      result: 'failed',
      reasonCode: 'DECRYPT_FAILED',
    });
    throw new ByokPublicError(
      BYOK_ERROR_CODE.BYOK_KEY_UNAVAILABLE,
      404,
      '未找到有效的第三方服务 API Key，请先保存凭据。',
    );
  }
}

export async function getUserThirdPartyServiceApiKey(
  userId: string,
  serviceName: string,
  meta: CredentialRequestMeta = {},
  dependencies: CredentialServiceDependencies = {},
): Promise<string> {
  const listCredentials = dependencies.listStoredCredentials ?? listStoredCredentials;
  const credentials = await listCredentials(userId);
  const credential = credentials.find(
    (item) =>
      item.serviceName === serviceName &&
      item.status === CREDENTIAL_STATUS.ACTIVE &&
      item.remainingSeconds > 0,
  );

  if (!credential) {
    throw new ByokPublicError(
      BYOK_ERROR_CODE.BYOK_KEY_UNAVAILABLE,
      404,
      `未找到有效的 ${serviceName} API Key，请先保存凭据。`,
    );
  }

  const { apiKey, payload } = await getDecryptedCredential(
    userId,
    credential.credentialId,
    meta,
    dependencies,
  );

  if (payload.serviceName !== serviceName) {
    throw new ByokPublicError(BYOK_ERROR_CODE.BYOK_KEY_UNAVAILABLE, 404);
  }

  return apiKey;
}

export async function deleteUserThirdPartyServiceCredential(
  userId: string,
  credentialId: string,
  meta: CredentialRequestMeta = {},
  dependencies: CredentialServiceDependencies = {},
): Promise<{ credentialId: string; deleted: true }> {
  const deleteCredential = dependencies.deleteStoredCredential ?? deleteStoredCredential;

  await deleteCredential(userId, credentialId);
  writeByokAuditEvent({
    eventType: 'THIRD_PARTY_SERVICE_CREDENTIAL_DELETE_SUCCESS',
    actorId: userId,
    requestId: meta.requestId,
    ip: meta.ip,
    result: 'success',
  });

  return { credentialId, deleted: true };
}

export async function overwriteUserThirdPartyServiceCredential(
  userId: string,
  credentialId: string,
  input: OverwriteCredentialInput,
  meta: CredentialRequestMeta = {},
  dependencies: CredentialServiceDependencies = {},
): Promise<SavedCredentialResult> {
  const getCredential = dependencies.getStoredCredential ?? getStoredCredential;
  const encrypt = dependencies.encryptCredential ?? encryptCredential;
  const save = dependencies.saveStoredCredential ?? saveStoredCredential;
  const validateKey = dependencies.validateApiKey ?? validateApiKey;
  const stored = await getCredential(userId, credentialId);

  if (!stored) {
    throw new ByokPublicError(
      BYOK_ERROR_CODE.BYOK_KEY_UNAVAILABLE,
      404,
      '未找到有效的第三方服务 API Key，请先保存凭据。',
    );
  }

  if (!validateKey(input.apiKey)) {
    throw new ByokPublicError(BYOK_ERROR_CODE.INVALID_REQUEST, 400);
  }

  const expiry = buildCredentialExpiry(input.ttlOption);
  const payload = await encrypt(
    input.apiKey,
    { credentialId, serviceName: stored.payload.serviceName, userId },
    { expiresAt: expiry.expiresAt, label: input.label },
  );
  const status = await save(
    userId,
    {
      ...payload,
      createdAt: stored.payload.createdAt,
      lastUsedAt: stored.payload.lastUsedAt,
    },
    expiry.ttlSeconds,
  );

  writeByokAuditEvent({
    eventType: 'THIRD_PARTY_SERVICE_CREDENTIAL_OVERWRITE_SUCCESS',
    actorId: userId,
    provider: stored.payload.serviceName,
    requestId: meta.requestId,
    ip: meta.ip,
    result: 'success',
  });

  return {
    saved: true,
    ...status,
  };
}
