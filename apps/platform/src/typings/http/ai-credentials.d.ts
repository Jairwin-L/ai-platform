declare namespace IApiAiCredentials {
  type AiCredentialProvider = 'anthropic' | 'deepseek' | 'gemini' | 'openai';
  type AiCredentialStatus = 'active' | 'disabled' | 'expired' | 'invalid';
  type AiCredentialTtlOption = '2w' | '3w' | '4w' | '7d';

  interface AiCredential {
    credentialId: string;
    expiresAt: string;
    keyHint: string;
    label: string;
    lastUsedAt?: string;
    provider: AiCredentialProvider;
    remainingSeconds: number;
    status: AiCredentialStatus;
  }

  interface SaveAiCredentialPayload {
    apiKey: string;
    label: string;
    provider: AiCredentialProvider;
    ttlOption: AiCredentialTtlOption;
  }

  interface AiProviderOption {
    color: string;
    label: string;
    value: AiCredentialProvider;
  }

  interface AiCredentialListResponse {
    credentials: AiCredential[];
  }
}
