export type ByokProvider = IByok.Provider;

export const BYOK_PROVIDER_VALUE_PATTERN = /^[a-z][a-z0-9_-]{0,39}$/u;

export const BYOK_ENCRYPTION_ALGORITHM = 'aes-256-gcm';
export const BYOK_PAYLOAD_VERSION = 1;
export const BYOK_REDIS_KEY_PREFIX = 'ai:byok:v1';
export const BYOK_AAD_PREFIX = 'byok:v1';
export const BYOK_REQUEST_BODY_LIMIT_BYTES = 8 * 1024;

export const BYOK_DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7;
export const BYOK_TTL_OPTION_SECONDS = {
  '7d': BYOK_DEFAULT_TTL_SECONDS,
  '2w': 60 * 60 * 24 * 14,
  '3w': 60 * 60 * 24 * 21,
  '4w': 60 * 60 * 24 * 28,
} as const;

export type ByokTtlOption = IByok.TtlOption;

export const BYOK_CREDENTIAL_STATUS = {
  ACTIVE: 'active',
  INVALID: 'invalid',
  EXPIRED: 'expired',
  DISABLED: 'disabled',
} as const;

export type ByokCredentialStatus = IByok.CredentialStatus;

export const BYOK_AUDIT_EVENT = {
  KEY_SAVE_SUCCESS: 'BYOK_KEY_SAVE_SUCCESS',
  KEY_OVERWRITE_SUCCESS: 'BYOK_KEY_OVERWRITE_SUCCESS',
  KEY_DELETE_SUCCESS: 'BYOK_KEY_DELETE_SUCCESS',
  KEY_INVALID_AUTO_REMOVED: 'BYOK_KEY_INVALID_AUTO_REMOVED',
  KEY_DECRYPT_FAILED: 'BYOK_KEY_DECRYPT_FAILED',
  UNAUTHORIZED_ACCESS_ATTEMPT: 'BYOK_UNAUTHORIZED_ACCESS_ATTEMPT',
  RATE_LIMITED: 'BYOK_RATE_LIMITED',
  KEY_TTL_MISSING_REMOVED: 'BYOK_KEY_TTL_MISSING_REMOVED',
} as const;

export const BYOK_ERROR_CODE = {
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_REQUEST: 'INVALID_REQUEST',
  UNSUPPORTED_PROVIDER: 'UNSUPPORTED_PROVIDER',
  BYOK_KEY_UNAVAILABLE: 'BYOK_KEY_UNAVAILABLE',
  BYOK_KEY_INVALID: 'BYOK_KEY_INVALID',
  RATE_LIMITED: 'RATE_LIMITED',
  AI_PROVIDER_UNAVAILABLE: 'AI_PROVIDER_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ByokErrorCode = IByok.ErrorCode;

export const BYOK_SAFE_RESPONSE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  Pragma: 'no-cache',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
} as const;

export const BYOK_SUCCESS_RESPONSE_OPTIONS = {
  headers: BYOK_SAFE_RESPONSE_HEADERS,
} as const;

export const BYOK_CHAT_LIMITS = {
  maxHourlyRequests: 120,
  maxDailyRequests: 1000,
  maxConcurrentRequests: 3,
  maxMessages: 20,
  maxMessageLength: 4000,
  maxTotalLength: 12000,
  timeoutMs: 30000,
};
