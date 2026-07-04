import crypto from 'node:crypto';
import {
  CREDENTIAL_AAD_PREFIX,
  CREDENTIAL_ENCRYPTION_ALGORITHM,
  CREDENTIAL_PAYLOAD_VERSION,
  CREDENTIAL_STATUS,
} from './constants';
import {
  envEncryptionKeyProvider,
  type EncryptionKeyProvider,
} from '@/lib/ai/byok/encryption-key-provider';

export type CredentialAadContext = IThirdPartyServiceCredentials.CredentialAadContext;
export type CredentialEncryptionMetadata =
  IThirdPartyServiceCredentials.CredentialEncryptionMetadata;
export type EncryptedCredentialPayload =
  IThirdPartyServiceCredentials.EncryptedCredentialPayload;

function createAad(context: CredentialAadContext): Buffer {
  return Buffer.from(
    `${CREDENTIAL_AAD_PREFIX}:${context.userId}:${context.serviceName}:${context.credentialId}`,
    'utf8',
  );
}

export function createKeyHint(apiKey: string): string {
  const head = apiKey.startsWith('sk-') ? 'sk' : 'key';
  const tail = apiKey.slice(-4);

  return `${head}-****${tail}`;
}

export async function encryptCredential(
  apiKey: string,
  context: CredentialAadContext,
  metadata: CredentialEncryptionMetadata,
  keyProvider: EncryptionKeyProvider = envEncryptionKeyProvider,
): Promise<EncryptedCredentialPayload> {
  const { version: keyVersion, key } = await keyProvider.getActiveKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(CREDENTIAL_ENCRYPTION_ALGORITHM, key, iv);
  cipher.setAAD(createAad(context));

  const ciphertext = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    algorithm: CREDENTIAL_ENCRYPTION_ALGORITHM,
    authTag: authTag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
    createdAt: new Date().toISOString(),
    credentialId: context.credentialId,
    expiresAt: metadata.expiresAt,
    iv: iv.toString('base64'),
    keyHint: createKeyHint(apiKey),
    keyVersion,
    label: metadata.label,
    serviceName: context.serviceName,
    status: metadata.status ?? CREDENTIAL_STATUS.ACTIVE,
    version: CREDENTIAL_PAYLOAD_VERSION,
  };
}

export async function decryptCredential(
  payload: EncryptedCredentialPayload,
  context: CredentialAadContext,
  keyProvider: EncryptionKeyProvider = envEncryptionKeyProvider,
): Promise<string> {
  if (
    payload.algorithm !== CREDENTIAL_ENCRYPTION_ALGORITHM ||
    payload.version !== CREDENTIAL_PAYLOAD_VERSION
  ) {
    throw new Error('第三方服务凭据密文格式无效');
  }

  const key = await keyProvider.getKeyByVersion(payload.keyVersion);
  const decipher = crypto.createDecipheriv(
    CREDENTIAL_ENCRYPTION_ALGORITHM,
    key,
    Buffer.from(payload.iv, 'base64'),
  );

  decipher.setAAD(createAad(context));
  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
