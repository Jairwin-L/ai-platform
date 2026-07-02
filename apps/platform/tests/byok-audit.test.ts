import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { BYOK_AUDIT_EVENT } from '@/lib/ai/byok/constants';
import { writeByokAuditEvent } from '@/lib/ai/security/audit';
import { logger } from '@/lib/server/logger';

describe('BYOK audit', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('records only hashed actor and ip metadata', () => {
    const info = vi.spyOn(logger, 'info').mockImplementation(() => undefined);
    const ip = ['203', '0', '113', '10'].join('.');

    writeByokAuditEvent({
      eventType: BYOK_AUDIT_EVENT.KEY_SAVE_SUCCESS,
      actorId: 'user-1',
      provider: 'openai',
      requestId: 'req_test',
      ip,
      result: 'success',
    });

    const [payload] = info.mock.calls[0];
    const serialized = JSON.stringify(payload);

    expect(serialized).toContain(BYOK_AUDIT_EVENT.KEY_SAVE_SUCCESS);
    expect(serialized).toContain('actorIdHash');
    expect(serialized).toContain('ipHash');
    expect(serialized).not.toContain('user-1');
    expect(serialized.includes(ip)).toBe(false);
    expect(serialized).not.toContain('apiKey');
    expect(serialized).not.toContain('ciphertext');
  });
});
