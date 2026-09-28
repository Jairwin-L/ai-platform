import type { Request } from 'express';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { BYOK_ERROR_CODE } from '@/lib/ai/byok/constants';
import {
  assertByokRequestSecurity,
  parseLimitedJsonBody,
} from '@/lib/ai/security/request-security';
import { chatRequestSchema, saveApiCredentialSchema } from '@/lib/ai/byok/schemas';

const mockSystemSettings = vi.hoisted(() => ({
  byokAllowedOrigins: 'http://localhost:8060',
}));

vi.mock('@/infra/prisma/prisma-client', () => ({
  prisma: {
    systemSettings: {
      findUnique: async () => ({
        byok_allowed_origins: mockSystemSettings.byokAllowedOrigins,
      }),
    },
  },
}));

type RequestLike = Pick<Request, 'headers' | 'protocol'>;

/** assertByokRequestSecurity 只读请求头与直连协议，构造最小的 Express 请求替身即可 */
function createRequest(url: string, headers: Record<string, string> = {}): RequestLike {
  return {
    protocol: new URL(url).protocol.replace(':', ''),
    headers: Object.fromEntries(
      Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
    ),
  };
}

function captureError(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return undefined;
}

describe('BYOK request security', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.BYOK_TRUST_PROXY_HEADERS;
    delete process.env.BYOK_ALLOWED_ORIGINS;
    mockSystemSettings.byokAllowedOrigins = 'http://localhost:8060';
  });

  it('rejects untrusted origins and cross-site fetch metadata', async () => {
    const options = { requireJson: true, requireOrigin: true };
    const url = 'http://localhost:8070/platform/user/ai-credentials';

    await expect(
      assertByokRequestSecurity(
        createRequest(url, { 'content-type': 'application/json' }),
        options,
      ),
    ).rejects.toMatchObject({ code: BYOK_ERROR_CODE.FORBIDDEN });

    await expect(
      assertByokRequestSecurity(
        createRequest(url, {
          'content-type': 'application/json',
          origin: 'https://evil.example',
        }),
        options,
      ),
    ).rejects.toMatchObject({ code: BYOK_ERROR_CODE.FORBIDDEN });

    await expect(
      assertByokRequestSecurity(
        createRequest(url, {
          'content-type': 'application/json',
          origin: 'http://localhost:8060',
          'sec-fetch-site': 'cross-site',
        }),
        options,
      ),
    ).rejects.toMatchObject({ code: BYOK_ERROR_CODE.FORBIDDEN });
  });

  it('rejects oversized request bodies with INVALID_REQUEST', async () => {
    const oversizedByHeader = createRequest('http://localhost:8070/platform/user/ai-credentials', {
      'content-type': 'application/json',
      'content-length': '9000',
    });

    await expect(assertByokRequestSecurity(oversizedByHeader)).rejects.toMatchObject({
      code: BYOK_ERROR_CODE.INVALID_REQUEST,
      status: 413,
    });

    const error = captureError(() =>
      parseLimitedJsonBody(
        { provider: 'test-provider', label: 'Test provider main', apiKey: 'x'.repeat(9000) },
        saveApiCredentialSchema,
      ),
    );

    expect(error).toMatchObject({ code: BYOK_ERROR_CODE.INVALID_REQUEST, status: 413 });
  });

  it('does not fall back to BYOK_ALLOWED_ORIGINS env when system settings are empty', async () => {
    mockSystemSettings.byokAllowedOrigins = '';
    process.env.BYOK_ALLOWED_ORIGINS = 'http://localhost:8060';
    const request = createRequest('http://localhost:8070/platform/user/ai-credentials', {
      'content-type': 'application/json',
      origin: 'http://localhost:8060',
    });

    await expect(
      assertByokRequestSecurity(request, { requireJson: true, requireOrigin: true }),
    ).rejects.toMatchObject({ code: BYOK_ERROR_CODE.FORBIDDEN });
  });

  it('rejects client-controlled ownership and provider url fields', () => {
    const apiKey = ['sk', 'test', 'secret'].join('-');

    const saveError = captureError(() =>
      parseLimitedJsonBody(
        {
          provider: 'test-provider',
          label: 'Test provider main',
          apiKey,
          credentialId: 'cred_11111111111111111111111111111111',
          userId: 'attacker',
          role: 'admin',
          redisKey: 'ai:byok:v1:any',
        },
        saveApiCredentialSchema,
      ),
    );
    expect(saveError).toMatchObject({ code: BYOK_ERROR_CODE.INVALID_REQUEST, status: 400 });

    const chatError = captureError(() =>
      parseLimitedJsonBody(
        {
          credentialId: 'cred_11111111111111111111111111111111',
          provider: 'test-provider',
          model: 'test-model',
          baseUrl: 'https://evil.example',
          messages: [{ role: 'user', content: 'hello' }],
        },
        chatRequestSchema,
      ),
    );
    expect(chatError).toMatchObject({ code: BYOK_ERROR_CODE.INVALID_REQUEST, status: 400 });
  });

  it('trusts x-forwarded-proto only when proxy headers are explicitly trusted', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const options = { requireJson: true, requireOrigin: true };

    // 经 platform 转发后协议头会被追加成 `https,http`，只认最前面那一跳
    const request = createRequest('http://localhost:8070/platform/user/ai-credentials', {
      'content-type': 'application/json',
      origin: 'http://localhost:8060',
      'x-forwarded-proto': 'https,http',
    });

    await expect(assertByokRequestSecurity(request, options)).rejects.toMatchObject({
      code: BYOK_ERROR_CODE.FORBIDDEN,
    });

    vi.stubEnv('BYOK_TRUST_PROXY_HEADERS', 'true');

    await expect(assertByokRequestSecurity(request, options)).resolves.toBeUndefined();
  });
});
