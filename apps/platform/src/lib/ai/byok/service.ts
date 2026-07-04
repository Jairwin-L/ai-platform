import {
  BYOK_AUDIT_EVENT,
  BYOK_ERROR_CODE,
} from './constants';
import { decryptApiKey, encryptApiKey } from './crypto';
import type { EncryptedApiKeyPayload } from './crypto';
import { ByokPublicError } from './errors';
import {
  buildCredentialExpiry,
  createCredentialId,
  deleteStoredApiCredential,
  getStoredApiCredential,
  listStoredApiCredentials,
  saveStoredApiCredential,
  touchStoredApiCredentialLastUsed,
  type StoredCredentialStatus,
} from './key-store';
import {
  callAiProvider,
  ProviderAuthenticationError,
  validateProviderApiKey,
  type ChatCompletionResult,
} from './provider';
import type {
  ChatRequestInput,
  OverwriteApiCredentialInput,
  SaveApiCredentialInput,
} from './schemas';
import { writeByokAuditEvent } from '@/lib/ai/security/audit';

export type ByokRequestMeta = IByok.RequestMeta;
export type ByokServiceDependencies = IByok.ServiceDependencies;
export type SavedCredentialResult = IByok.SavedCredentialResult;

export async function saveUserApiCredential(
  userId: string,
  input: SaveApiCredentialInput,
  meta: ByokRequestMeta = {},
  dependencies: ByokServiceDependencies = {},
): Promise<SavedCredentialResult> {
  const createId = dependencies.createCredentialId ?? createCredentialId;
  const encrypt = dependencies.encryptApiKey ?? encryptApiKey;
  const save = dependencies.saveStoredApiCredential ?? saveStoredApiCredential;
  const validateKey = dependencies.validateProviderApiKey ?? validateProviderApiKey;

  if (!validateKey(input.provider, input.apiKey)) {
    throw new ByokPublicError(BYOK_ERROR_CODE.INVALID_REQUEST, 400);
  }

  const credentialId = createId();
  const expiry = buildCredentialExpiry(input.ttlOption);
  const payload = await encrypt(
    input.apiKey,
    { userId, provider: input.provider, credentialId },
    { label: input.label, expiresAt: expiry.expiresAt },
  );
  const status = await save(userId, payload, expiry.ttlSeconds);

  writeByokAuditEvent({
    eventType: BYOK_AUDIT_EVENT.KEY_SAVE_SUCCESS,
    actorId: userId,
    provider: input.provider,
    requestId: meta.requestId,
    ip: meta.ip,
    result: 'success',
  });

  return {
    saved: true,
    ...status,
  };
}

export async function listUserApiCredentials(
  userId: string,
  dependencies: ByokServiceDependencies = {},
): Promise<{ credentials: StoredCredentialStatus[] }> {
  const listCredentials = dependencies.listStoredApiCredentials ?? listStoredApiCredentials;

  return { credentials: await listCredentials(userId) };
}

export async function deleteUserApiCredential(
  userId: string,
  credentialId: string,
  meta: ByokRequestMeta = {},
  dependencies: ByokServiceDependencies = {},
): Promise<{ deleted: true; credentialId: string }> {
  const deleteCredential = dependencies.deleteStoredApiCredential ?? deleteStoredApiCredential;

  await deleteCredential(userId, credentialId);
  writeByokAuditEvent({
    eventType: BYOK_AUDIT_EVENT.KEY_DELETE_SUCCESS,
    actorId: userId,
    requestId: meta.requestId,
    ip: meta.ip,
    result: 'success',
  });

  return { deleted: true, credentialId };
}

export async function overwriteUserApiCredential(
  userId: string,
  credentialId: string,
  input: OverwriteApiCredentialInput,
  meta: ByokRequestMeta = {},
  dependencies: ByokServiceDependencies = {},
): Promise<SavedCredentialResult> {
  const getCredential = dependencies.getStoredApiCredential ?? getStoredApiCredential;
  const encrypt = dependencies.encryptApiKey ?? encryptApiKey;
  const save = dependencies.saveStoredApiCredential ?? saveStoredApiCredential;
  const validateKey = dependencies.validateProviderApiKey ?? validateProviderApiKey;
  const stored = await getCredential(userId, credentialId);

  if (!stored) {
    throw new ByokPublicError(BYOK_ERROR_CODE.BYOK_KEY_UNAVAILABLE, 404);
  }

  if (!validateKey(stored.payload.provider, input.apiKey)) {
    throw new ByokPublicError(BYOK_ERROR_CODE.INVALID_REQUEST, 400);
  }

  const expiry = buildCredentialExpiry(input.ttlOption);
  const payload = await encrypt(
    input.apiKey,
    { userId, provider: stored.payload.provider, credentialId },
    { label: input.label, expiresAt: expiry.expiresAt },
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
    eventType: BYOK_AUDIT_EVENT.KEY_OVERWRITE_SUCCESS,
    actorId: userId,
    provider: stored.payload.provider,
    requestId: meta.requestId,
    ip: meta.ip,
    result: 'success',
  });

  return {
    saved: true,
    ...status,
  };
}

async function getDecryptedApiKey(
  userId: string,
  credentialId: string,
  meta: ByokRequestMeta,
  dependencies: ByokServiceDependencies,
): Promise<{
  apiKey: string;
  payload: EncryptedApiKeyPayload;
  remainingSeconds: number;
}> {
  const getCredential = dependencies.getStoredApiCredential ?? getStoredApiCredential;
  const decrypt = dependencies.decryptApiKey ?? decryptApiKey;
  const stored = await getCredential(userId, credentialId);

  if (!stored) {
    throw new ByokPublicError(BYOK_ERROR_CODE.BYOK_KEY_UNAVAILABLE, 404);
  }

  try {
    return {
      apiKey: await decrypt(stored.payload, {
        userId,
        provider: stored.payload.provider,
        credentialId,
      }),
      payload: stored.payload,
      remainingSeconds: stored.remainingSeconds,
    };
  } catch {
    writeByokAuditEvent({
      eventType: BYOK_AUDIT_EVENT.KEY_DECRYPT_FAILED,
      actorId: userId,
      provider: stored.payload.provider,
      requestId: meta.requestId,
      ip: meta.ip,
      result: 'failed',
      reasonCode: 'DECRYPT_FAILED',
    });
    throw new ByokPublicError(BYOK_ERROR_CODE.BYOK_KEY_UNAVAILABLE, 404);
  }
}

export async function createByokChatCompletion(
  userId: string,
  input: ChatRequestInput,
  meta: ByokRequestMeta = {},
  dependencies: ByokServiceDependencies = {},
): Promise<ChatCompletionResult> {
  const { apiKey, payload, remainingSeconds } = await getDecryptedApiKey(
    userId,
    input.credentialId,
    meta,
    dependencies,
  );
  const callProvider = dependencies.callAiProvider ?? callAiProvider;
  const deleteCredential = dependencies.deleteStoredApiCredential ?? deleteStoredApiCredential;
  const touchCredential =
    dependencies.touchStoredApiCredentialLastUsed ?? touchStoredApiCredentialLastUsed;

  try {
    const result = await callProvider(apiKey, payload.provider, input);

    try {
      await touchCredential(userId, payload, remainingSeconds);
    } catch {
      // Last-used metadata is best-effort and must not mask a successful provider response.
    }

    return result;
  } catch (error) {
    if (error instanceof ProviderAuthenticationError) {
      await deleteCredential(userId, input.credentialId);
      writeByokAuditEvent({
        eventType: BYOK_AUDIT_EVENT.KEY_INVALID_AUTO_REMOVED,
        actorId: userId,
        provider: payload.provider,
        requestId: meta.requestId,
        ip: meta.ip,
        result: 'failed',
        reasonCode: BYOK_ERROR_CODE.BYOK_KEY_INVALID,
      });
      throw new ByokPublicError(BYOK_ERROR_CODE.BYOK_KEY_INVALID, 401);
    }

    throw error;
  }
}
