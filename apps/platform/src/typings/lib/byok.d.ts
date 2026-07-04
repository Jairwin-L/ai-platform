declare namespace IByok {
  type Provider = string;
  type TtlOption = '2w' | '3w' | '4w' | '7d';
  type CredentialStatus = 'active' | 'disabled' | 'expired' | 'invalid';
  type ErrorCode =
    | 'UNAUTHENTICATED'
    | 'FORBIDDEN'
    | 'INVALID_REQUEST'
    | 'UNSUPPORTED_PROVIDER'
    | 'BYOK_KEY_UNAVAILABLE'
    | 'BYOK_KEY_INVALID'
    | 'RATE_LIMITED'
    | 'AI_PROVIDER_UNAVAILABLE'
    | 'INTERNAL_ERROR';

  interface EncryptedApiKeyPayload {
    version: number;
    credentialId: string;
    provider: Provider;
    label: string;
    algorithm: string;
    keyVersion: string;
    ciphertext: string;
    iv: string;
    authTag: string;
    keyHint: string;
    createdAt: string;
    expiresAt: string;
    lastUsedAt?: string;
    status: CredentialStatus;
  }

  interface ApiKeyAadContext {
    userId: string;
    provider: Provider;
    credentialId: string;
  }

  interface ApiKeyEncryptionMetadata {
    label: string;
    expiresAt: string;
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
    provider: Provider;
    label: string;
    keyHint: string;
    expiresAt: string;
    lastUsedAt?: string;
    remainingSeconds: number;
    status: CredentialStatus;
  }

  interface RequestMeta {
    requestId?: string;
    ip?: string;
  }

  interface ServiceDependencies {
    callAiProvider?: typeof import('@/lib/ai/byok/provider').callAiProvider;
    createCredentialId?: typeof import('@/lib/ai/byok/key-store').createCredentialId;
    decryptApiKey?: typeof import('@/lib/ai/byok/crypto').decryptApiKey;
    deleteStoredApiCredential?: typeof import('@/lib/ai/byok/key-store').deleteStoredApiCredential;
    encryptApiKey?: typeof import('@/lib/ai/byok/crypto').encryptApiKey;
    getStoredApiCredential?: typeof import('@/lib/ai/byok/key-store').getStoredApiCredential;
    listStoredApiCredentials?: typeof import('@/lib/ai/byok/key-store').listStoredApiCredentials;
    saveStoredApiCredential?: typeof import('@/lib/ai/byok/key-store').saveStoredApiCredential;
    touchStoredApiCredentialLastUsed?: typeof import('@/lib/ai/byok/key-store').touchStoredApiCredentialLastUsed;
    validateProviderApiKey?: typeof import('@/lib/ai/byok/provider').validateProviderApiKey;
  }

  interface SavedCredentialResult extends StoredCredentialStatus {
    saved: true;
  }

  interface ChatCompletionResult {
    provider: Provider;
    model: string;
    content: string;
  }

  interface ProviderErrorPayload {
    error?: {
      code?: unknown;
      message?: unknown;
      status?: unknown;
      type?: unknown;
    };
  }

  interface OpenAiCompatibleResponse {
    choices?: Array<{ message?: { content?: string } }>;
  }

  interface AnthropicResponse {
    content?: Array<{ text?: string; type?: string }>;
  }

  interface GeminiResponse {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  }

  interface AiProviderOption {
    apiKeyUrl?: string;
    color: string;
    enabled: boolean;
    label: string;
    value: Provider;
  }

  type EnabledAiProviderOption = Omit<AiProviderOption, 'enabled'>;

  interface AuditEvent {
    eventType: string;
    actorId?: string;
    provider?: string;
    requestId?: string;
    ip?: string;
    result: 'success' | 'blocked' | 'failed';
    reasonCode?: string;
  }

  interface RateLimitRedisClient {
    decr(key: string): Promise<number>;
    expire(key: string, seconds: number): Promise<void>;
    incr(key: string): Promise<number>;
  }

  interface RateLimitInput {
    userId: string;
    ip: string;
    route: string;
    limit: number;
    windowSeconds: number;
    requestId?: string;
  }

  interface EncryptionKeyProvider {
    getActiveKey(): Promise<{
      version: string;
      key: Buffer;
    }>;

    getKeyByVersion(version: string): Promise<Buffer>;
  }

  type ErrorReporter = (payload: unknown) => void | Promise<void>;

  type SaveApiCredentialInput = import('zod').infer<
    typeof import('@/lib/ai/byok/schemas').saveApiCredentialSchema
  >;

  type OverwriteApiCredentialInput = import('zod').infer<
    typeof import('@/lib/ai/byok/schemas').overwriteApiCredentialSchema
  >;

  type SaveOrOverwriteApiCredentialInput = import('zod').infer<
    typeof import('@/lib/ai/byok/schemas').saveOrOverwriteApiCredentialSchema
  >;

  type ChatRequestInput = import('zod').infer<
    typeof import('@/lib/ai/byok/schemas').chatRequestSchema
  >;

  type RouteErrorResponseBody = IServer.ApiErrorResponse;

  interface ProviderOptionRow {
    api_key_url: string | null;
    color: string;
    enabled: boolean;
    label: string;
    sort_order: number;
    value: string;
  }
}
