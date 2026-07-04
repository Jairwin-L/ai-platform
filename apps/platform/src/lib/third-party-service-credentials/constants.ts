export const CREDENTIAL_ENCRYPTION_ALGORITHM = 'aes-256-gcm';
export const CREDENTIAL_PAYLOAD_VERSION = 1;
export const CREDENTIAL_REDIS_KEY_PREFIX = 'third-party:api-credentials:v1';
export const CREDENTIAL_INDEX_REDIS_KEY_PREFIX = 'third-party:api-credentials:index';
export const CREDENTIAL_AAD_PREFIX = 'third-party-service-api-credential:v1';

export const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7;
export const TTL_OPTION_SECONDS = {
  '7d': DEFAULT_TTL_SECONDS,
  '2w': 60 * 60 * 24 * 14,
  '3w': 60 * 60 * 24 * 21,
  '4w': 60 * 60 * 24 * 28,
} as const;

export const CREDENTIAL_STATUS = {
  ACTIVE: 'active',
  INVALID: 'invalid',
  EXPIRED: 'expired',
  DISABLED: 'disabled',
} as const;

export type CredentialStatus = IThirdPartyServiceCredentials.CredentialStatus;
export type CredentialTtlOption = IThirdPartyServiceCredentials.TtlOption;
