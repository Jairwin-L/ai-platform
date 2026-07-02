import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { logger } from '@/lib/server/logger';

describe('server logger redaction', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('redacts request-like sensitive data before writing logs', () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const apiKey = ['sk', 'test', 'secret', '123456'].join('-');
    const bearerToken = ['abc', 'def', 'ghi'].join('.');

    logger.info(
      {
        body: {
          apiKey,
          Authorization: `Bearer ${bearerToken}`,
        },
        ciphertext: 'encrypted-value',
      },
      `saving ${apiKey} with Bearer ${bearerToken}`,
    );

    const output = write.mock.calls.map((call) => String(call[0])).join('');

    expect(output).toContain('[REDACTED]');
    expect(output.includes(apiKey)).toBe(false);
    expect(output.includes(bearerToken)).toBe(false);
    expect(output).not.toContain('encrypted-value');
  });
});
