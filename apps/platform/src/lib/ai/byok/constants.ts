export const BYOK_PROVIDER = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  GEMINI: 'gemini',
  DEEPSEEK: 'deepseek',
} as const;

export type ByokProvider = IByok.Provider;

export const SUPPORTED_BYOK_PROVIDERS = [
  BYOK_PROVIDER.OPENAI,
  BYOK_PROVIDER.ANTHROPIC,
  BYOK_PROVIDER.GEMINI,
  BYOK_PROVIDER.DEEPSEEK,
] as const;

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

export const OPENAI_CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';
export const OPENAI_ALLOWED_MODELS = ['gpt-4o-mini', 'gpt-4.1-mini'] as const;

export const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
export const ANTHROPIC_ALLOWED_MODELS = ['claude-3-5-haiku-latest'] as const;
export const ANTHROPIC_VERSION = '2023-06-01';

export const GEMINI_GENERATE_CONTENT_URL_PREFIX =
  'https://generativelanguage.googleapis.com/v1beta/models';
export const GEMINI_ALLOWED_MODELS = ['gemini-2.5-flash'] as const;

export const DEEPSEEK_CHAT_COMPLETIONS_URL = 'https://api.deepseek.com/chat/completions';
export const DEEPSEEK_ALLOWED_MODELS = ['deepseek-chat', 'deepseek-reasoner'] as const;

export const BYOK_ALLOWED_CHAT_MODELS = [
  ...OPENAI_ALLOWED_MODELS,
  ...ANTHROPIC_ALLOWED_MODELS,
  ...GEMINI_ALLOWED_MODELS,
  ...DEEPSEEK_ALLOWED_MODELS,
] as const;

export const BYOK_ALLOWED_MODELS_BY_PROVIDER = {
  [BYOK_PROVIDER.OPENAI]: OPENAI_ALLOWED_MODELS,
  [BYOK_PROVIDER.ANTHROPIC]: ANTHROPIC_ALLOWED_MODELS,
  [BYOK_PROVIDER.GEMINI]: GEMINI_ALLOWED_MODELS,
  [BYOK_PROVIDER.DEEPSEEK]: DEEPSEEK_ALLOWED_MODELS,
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
