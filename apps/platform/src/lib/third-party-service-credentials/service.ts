import { BYOK_ERROR_CODE } from '@/lib/ai/byok/constants';
import { ByokPublicError } from '@/lib/ai/byok/errors';
import { writeByokAuditEvent } from '@/lib/ai/security/audit';
import { encryptCredential } from './crypto';
import {
  buildCredentialExpiry,
  createCredentialId,
  deleteStoredCredential,
  listStoredCredentials,
  saveStoredCredential,
  type StoredCredentialStatus,
} from './store';
import type { SaveCredentialInput } from './schemas';

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
  const save = dependencies.saveStoredCredential ?? saveStoredCredential;
  const validateKey = dependencies.validateApiKey ?? validateApiKey;

  if (!validateKey(input.apiKey)) {
    throw new ByokPublicError(BYOK_ERROR_CODE.INVALID_REQUEST, 400);
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
