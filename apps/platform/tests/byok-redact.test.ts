import { describe, expect, it, vi } from 'vite-plus/test';
import {
  redactSensitiveData,
  redactText,
  sanitizeForErrorReporting,
} from '@/lib/ai/security/redact';
import { reportSanitizedError } from '@/lib/ai/security/error-reporting';

describe('BYOK redaction', () => {
  it('redacts sensitive keys recursively', () => {
    const apiKey = ['sk', 'test', 'secret'].join('-');
    const result = redactSensitiveData({
      apiKey,
      nested: {
        Authorization: 'Bearer test-token',
        ciphertext: 'encrypted',
      },
    });

    expect(result.apiKey).toBe('[REDACTED]');
    expect(result.nested.Authorization).toBe('[REDACTED]');
    expect(result.nested.ciphertext).toBe('[REDACTED]');
  });

  it('redacts bearer and API-key-like secrets in text', () => {
    const projectKey = ['sk', 'proj', 'abcdef123456'].join('-');
    const legacyKey = ['sk', 'abcdef123456'].join('-');
    const text = redactText(
      `Authorization: Bearer abc.def.ghi apiKey=${projectKey} key=${legacyKey}`,
    );

    expect(text).not.toContain('abc.def.ghi');
    expect(text.includes(projectKey)).toBe(false);
    expect(text.includes(legacyKey)).toBe(false);
  });

  it('sanitizes Error instances before error reporting', () => {
    const legacyKey = ['sk', 'abcdef123456'].join('-');
    const error = new Error(`failed with Bearer abc.def.ghi and ${legacyKey}`);
    const sanitized = sanitizeForErrorReporting(error);

    expect(sanitized.message).toContain('Bearer [REDACTED]');
    expect(sanitized.message).toContain('sk-[REDACTED]');
    expect(sanitized.message).not.toContain('abc.def.ghi');
    expect(sanitized.message.includes(legacyKey)).toBe(false);
  });

  it('sanitizes payloads before calling an error reporter hook', async () => {
    const reporter = vi.fn();
    const apiKey = ['sk', 'abcdef123456'].join('-');

    await reportSanitizedError(reporter, {
      apiKey,
      headers: {
        Authorization: 'Bearer abc.def.ghi',
      },
      error: new Error(`failed with ${apiKey}`),
    });

    const [payload] = reporter.mock.calls[0];
    const serialized = JSON.stringify(payload);

    expect(serialized).toContain('[REDACTED]');
    expect(serialized.includes(apiKey)).toBe(false);
    expect(serialized).not.toContain('abc.def.ghi');
  });
});
