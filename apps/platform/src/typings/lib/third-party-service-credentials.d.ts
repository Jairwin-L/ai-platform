declare namespace IThirdPartyServiceCredentials {
  type TtlOption = '2w' | '3w' | '4w' | '7d';
  type CredentialStatus = 'active' | 'disabled' | 'expired' | 'invalid';

  interface EncryptedCredentialPayload {
    algorithm: string;
    authTag: string;
    ciphertext: string;
    createdAt: string;
    credentialId: string;
    expiresAt: string;
    iv: string;
    keyHint: string;
    keyVersion: string;
    label: string;
    lastUsedAt?: string;
    serviceName: string;
    status: CredentialStatus;
    version: number;
  }

  interface CredentialAadContext {
    credentialId: string;
    serviceName: string;
    userId: string;
  }

  interface CredentialEncryptionMetadata {
    expiresAt: string;
    label: string;
    status?: CredentialStatus;
  }

  interface RedisClient {
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

  interface StoredCredentialStatus {
    credentialId: string;
    expiresAt: string;
    keyHint: string;
    label: string;
    lastUsedAt?: string;
    remainingSeconds: number;
    serviceName: string;
    status: CredentialStatus;
  }

  interface RequestMeta {
    ip?: string;
    requestId?: string;
  }

  interface ServiceDependencies {
    createCredentialId?: typeof import('@/lib/third-party-service-credentials/store').createCredentialId;
    deleteStoredCredential?: typeof import('@/lib/third-party-service-credentials/store').deleteStoredCredential;
    encryptCredential?: typeof import('@/lib/third-party-service-credentials/crypto').encryptCredential;
    listStoredCredentials?: typeof import('@/lib/third-party-service-credentials/store').listStoredCredentials;
    saveStoredCredential?: typeof import('@/lib/third-party-service-credentials/store').saveStoredCredential;
    validateApiKey?: (apiKey: string) => boolean;
  }

  interface SavedCredentialResult extends StoredCredentialStatus {
    saved: true;
  }

  type SaveCredentialInput = import('zod').infer<
    typeof import('@/lib/third-party-service-credentials/schemas').saveCredentialSchema
  >;
}
