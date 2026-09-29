import crypto from 'node:crypto';
import {
  BYOK_AAD_PREFIX,
  BYOK_CREDENTIAL_STATUS,
  BYOK_ENCRYPTION_ALGORITHM,
  BYOK_PAYLOAD_VERSION,
} from './constants';
import { envEncryptionKeyProvider, type EncryptionKeyProvider } from './encryption-key-provider';

export type ApiKeyAadContext = IByok.ApiKeyAadContext;
export type ApiKeyEncryptionMetadata = IByok.ApiKeyEncryptionMetadata;
export type EncryptedApiKeyPayload = IByok.EncryptedApiKeyPayload;

function createAad(context: ApiKeyAadContext): Buffer {
  return Buffer.from(
    `${BYOK_AAD_PREFIX}:${context.userId}:${context.provider}:${context.credentialId}`,
    'utf8',
  );
}

export function createKeyHint(apiKey: string): string {
  const head = apiKey.startsWith('sk-') ? 'sk' : 'key';
  const tail = apiKey.slice(-4);

  return `${head}-****${tail}`;
}

export async function encryptApiKey(
  apiKey: string,
  context: ApiKeyAadContext,
  metadata: ApiKeyEncryptionMetadata,
  keyProvider: EncryptionKeyProvider = envEncryptionKeyProvider,
): Promise<EncryptedApiKeyPayload> {
  const { version: keyVersion, key } = await keyProvider.getActiveKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(BYOK_ENCRYPTION_ALGORITHM, key, iv);
  cipher.setAAD(createAad(context));

  const ciphertext = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    version: BYOK_PAYLOAD_VERSION,
    credentialId: context.credentialId,
    provider: context.provider,
    label: metadata.label,
    algorithm: BYOK_ENCRYPTION_ALGORITHM,
    keyVersion,
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    keyHint: createKeyHint(apiKey),
    createdAt: new Date().toISOString(),
    expiresAt: metadata.expiresAt,
    status: metadata.status ?? BYOK_CREDENTIAL_STATUS.ACTIVE,
  };
}

export async function decryptApiKey(
  payload: EncryptedApiKeyPayload,
  context: ApiKeyAadContext,
  keyProvider: EncryptionKeyProvider = envEncryptionKeyProvider,
): Promise<string> {
  if (payload.algorithm !== BYOK_ENCRYPTION_ALGORITHM || payload.version !== BYOK_PAYLOAD_VERSION) {
    throw new Error('BYOK 密文格式无效');
  }

  const key = await keyProvider.getKeyByVersion(payload.keyVersion);
  const decipher = crypto.createDecipheriv(
    BYOK_ENCRYPTION_ALGORITHM,
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
