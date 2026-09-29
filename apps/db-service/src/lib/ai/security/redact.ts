const SENSITIVE_KEYS = new Set([
  'apikey',
  'api_key',
  'authorization',
  'x-api-key',
  'cookie',
  'set-cookie',
  'ciphertext',
  'iv',
  'authtag',
  'ai_key_encryption_key',
  'ai_key_redis_id_secret',
]);

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replaceAll('_', '-');
  const compact = key.toLowerCase().replaceAll('_', '');
  const upper = key.toUpperCase();

  return (
    SENSITIVE_KEYS.has(normalized) ||
    SENSITIVE_KEYS.has(compact) ||
    upper.startsWith('AI_KEY_ENCRYPTION_KEY') ||
    upper.startsWith('AI_KEY_REDIS_ID_SECRET')
  );
}

export function redactText(value: string): string {
  return value
    .replaceAll(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, 'Bearer [REDACTED]')
    .replaceAll(/\bsk-proj-[A-Za-z0-9_-]{8,}\b/g, 'sk-proj-[REDACTED]')
    .replaceAll(/\bsk-[A-Za-z0-9_-]{8,}\b/g, 'sk-[REDACTED]');
}

export function redactSensitiveData<T>(value: T): T {
  if (typeof value === 'string') {
    return redactText(value) as T;
  }

  if (value instanceof Error) {
    const redactedError: {
      message: string;
      name: string;
      stack?: string;
    } = {
      name: redactText(value.name),
      message: redactText(value.message),
      stack: value.stack ? redactText(value.stack) : undefined,
    };

    return redactedError as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveData(item)) as T;
  }

  if (typeof value !== 'object' || value === null) {
    return value;
  }

  const output: Record<string, unknown> = {};

  for (const [key, item] of Object.entries(value)) {
    output[key] = isSensitiveKey(key) ? '[REDACTED]' : redactSensitiveData(item);
  }

  return output as T;
}

export function sanitizeForErrorReporting<T>(value: T): T {
  return redactSensitiveData(value);
}
