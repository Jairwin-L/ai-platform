declare namespace IApiThirdPartyServiceCredentials {
  type CredentialStatus = 'active' | 'disabled' | 'expired' | 'invalid';
  type CredentialTtlOption = '2w' | '3w' | '4w' | '7d';

  interface ThirdPartyServiceCredential {
    credentialId: string;
    expiresAt: string;
    keyHint: string;
    label: string;
    lastUsedAt?: string;
    remainingSeconds: number;
    serviceName: string;
    status: CredentialStatus;
  }

  interface SaveThirdPartyServiceCredentialPayload {
    apiKey: string;
    label: string;
    serviceName: string;
    ttlOption: CredentialTtlOption;
  }

  interface OverwriteThirdPartyServiceCredentialPayload {
    apiKey: string;
    credentialId: string;
    label: string;
    ttlOption: CredentialTtlOption;
  }

  interface ThirdPartyServiceOption {
    apiKeyUrl?: string;
    label: string;
    value: string;
  }

  type ThirdPartyServiceCredentialListResponse = ThirdPartyServiceCredential[];
}
