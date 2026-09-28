import { describe, expect, it } from 'vite-plus/test';
import { AUTH_ERROR, COMMON_ERROR } from '@ai/constants/error-codes';
import { ApiException } from '@/common/http/api-exception';
import { BYOK_ERROR_CODE } from '@/lib/ai/byok/constants';
import { ByokPublicError } from '@/lib/ai/byok/errors';
import { toByokPublicErrorFromException } from '@/lib/ai/byok/route-helpers';
import { AiPublicError } from '@/lib/ai/errors';
import { toAiPublicErrorFromException } from '@/lib/ai/route-helpers';

/**
 * 守卫与校验管道抛出的是通用 ApiException，BYOK / AI 接口要映射回迁移前的业务错误码，
 * 前端按 errorCode 做的判断才不会失效。
 */
describe('BYOK route error mapping', () => {
  it('maps guard failures to BYOK error codes', () => {
    expect(
      toByokPublicErrorFromException(
        new ApiException(AUTH_ERROR.UNAUTHORIZED, undefined, null, 401),
      ),
    ).toMatchObject({ code: BYOK_ERROR_CODE.UNAUTHENTICATED, status: 401 });

    expect(
      toByokPublicErrorFromException(
        new ApiException(AUTH_ERROR.FORBIDDEN, '缺少权限：管理 AI 设置', null, 403),
      ),
    ).toMatchObject({
      code: BYOK_ERROR_CODE.FORBIDDEN,
      status: 403,
      message: '缺少权限：管理 AI 设置',
    });

    expect(
      toByokPublicErrorFromException(
        new ApiException(COMMON_ERROR.VALIDATION_ERROR, 'apiKey: too short', [], 400),
      ),
    ).toMatchObject({
      code: BYOK_ERROR_CODE.INVALID_REQUEST,
      status: 400,
      message: '请求参数无效。',
    });
  });

  it('keeps BYOK errors and hides unexpected ones', () => {
    const original = new ByokPublicError(BYOK_ERROR_CODE.RATE_LIMITED, 429);
    expect(toByokPublicErrorFromException(original)).toBe(original);

    expect(toByokPublicErrorFromException(new Error('internal details'))).toMatchObject({
      code: BYOK_ERROR_CODE.INTERNAL_ERROR,
      status: 500,
    });
  });
});

describe('AI route error mapping', () => {
  it('uses the first schema issue message for validation errors', () => {
    const issues = [{ message: '内容不能为空', path: ['content'] }];

    expect(
      toAiPublicErrorFromException(
        new ApiException(COMMON_ERROR.VALIDATION_ERROR, 'content: 内容不能为空', issues, 400),
      ),
    ).toMatchObject({ code: 'INVALID_REQUEST', status: 422, message: '内容不能为空' });
  });

  it('maps auth failures and keeps AI public errors', () => {
    expect(
      toAiPublicErrorFromException(new ApiException(AUTH_ERROR.UNAUTHORIZED, undefined, null, 401)),
    ).toMatchObject({ code: 'UNAUTHORIZED', status: 401 });

    const original = new AiPublicError('CONVERSATION_BUSY', 409);
    expect(toAiPublicErrorFromException(original)).toBe(original);
  });
});
