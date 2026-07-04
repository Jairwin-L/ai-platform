declare namespace IApiAiCredentials {
  type AiCredentialProvider = string;
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

  interface OverwriteAiCredentialPayload {
    apiKey: string;
    credentialId: string;
    label: string;
    ttlOption: AiCredentialTtlOption;
  }

  interface AiProviderOption {
    apiKeyUrl?: string;
    color: string;
    label: string;
    models: string[];
    value: AiCredentialProvider;
  }

  type AiCredentialListResponse = AiCredential[];
}
