import { describe, expect, it } from 'vite-plus/test';
import { BYOK_ERROR_CODE } from '@/lib/ai/byok/constants';
import { ByokPublicError } from '@/lib/ai/byok/errors';
import { toAiPublicError } from '@/lib/ai/errors';

describe('AI error mapping', () => {
  it('preserves BYOK provider unavailable errors for AI chat responses', () => {
    const error = toAiPublicError(
      new ByokPublicError(BYOK_ERROR_CODE.AI_PROVIDER_UNAVAILABLE, 503),
    );

    expect(error).toMatchObject({
      code: 'AI_PROVIDER_UNAVAILABLE',
      message: 'AI Provider 暂时不可用，请稍后重试。',
      status: 503,
    });
  });

  it('does not classify generic server errors as invalid requests', () => {
    const error = toAiPublicError({ message: 'temporary failure', status: 503 });

    expect(error).toMatchObject({
      code: 'UPSTREAM_ERROR',
      message: 'temporary failure',
      status: 503,
    });
  });
});
