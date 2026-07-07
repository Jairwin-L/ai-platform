import crypto from 'node:crypto';
import type { AiSecretPayload } from './types';

const ALGORITHM = 'aes-256-gcm';

function getMasterKey(): Buffer {
  const raw = process.env.AI_SECRET_MASTER_KEY ?? process.env.AI_KEY_ENCRYPTION_KEY_V1;

  if (!raw) {
    throw new Error('AI_SECRET_MASTER_KEY 未配置');
  }

  const key = Buffer.from(raw, 'base64');

  if (key.length !== 32) {
    throw new Error('AI_SECRET_MASTER_KEY Base64 解码后必须为 32 字节');
  }

  return key;
}

export function getSecretLast4(value: string): string {
  return value.slice(-4);
}

export function encryptSecret(value: string, aad: string): Required<AiSecretPayload> {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getMasterKey(), iv);

  cipher.setAAD(Buffer.from(aad, 'utf8'));

  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    apiKeyCiphertext: ciphertext.toString('base64'),
    apiKeyIv: iv.toString('base64'),
    apiKeyTag: tag.toString('base64'),
    keyVersion: 1,
  };
}

export function decryptSecret(secret: AiSecretPayload, aad: string): string {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getMasterKey(),
    Buffer.from(secret.apiKeyIv, 'base64'),
  );

  decipher.setAAD(Buffer.from(aad, 'utf8'));
  decipher.setAuthTag(Buffer.from(secret.apiKeyTag, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(secret.apiKeyCiphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

export function createProviderSecretAad(userId: string, providerConfigId: string): string {
  return `${userId}:${providerConfigId}`;
}
