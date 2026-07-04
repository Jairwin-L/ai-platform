import { NextRequest } from 'next/server';
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

vi.mock('@/lib/prisma', () => ({
  prisma: {
    systemSettings: {
      findUnique: async () => ({
        byok_allowed_origins: mockSystemSettings.byokAllowedOrigins,
      }),
    },
  },
}));

function createRequest(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new Request(url, init));
}

describe('BYOK request security', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.BYOK_TRUST_PROXY_HEADERS;
    delete process.env.BYOK_ALLOWED_ORIGINS;
    mockSystemSettings.byokAllowedOrigins = 'http://localhost:8060';
  });

  it('rejects untrusted origins and cross-site fetch metadata', async () => {
    const missingOriginRequest = createRequest('http://localhost:8060/api/user/ai-credentials', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
    });

    await expect(
      assertByokRequestSecurity(missingOriginRequest, {
        requireJson: true,
        requireOrigin: true,
      }),
    ).rejects.toMatchObject({ code: BYOK_ERROR_CODE.FORBIDDEN });

    const untrustedOriginRequest = createRequest('http://localhost:8060/api/user/ai-credentials', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://evil.example',
      },
    });

    await expect(
      assertByokRequestSecurity(untrustedOriginRequest, {
        requireJson: true,
        requireOrigin: true,
      }),
    ).rejects.toMatchObject({ code: BYOK_ERROR_CODE.FORBIDDEN });

    const crossSiteRequest = createRequest('http://localhost:8060/api/user/ai-credentials', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:8060',
        'sec-fetch-site': 'cross-site',
      },
    });

    await expect(
      assertByokRequestSecurity(crossSiteRequest, {
        requireJson: true,
        requireOrigin: true,
      }),
    ).rejects.toMatchObject({ code: BYOK_ERROR_CODE.FORBIDDEN });
  });

  it('rejects oversized request bodies with INVALID_REQUEST', async () => {
    const request = createRequest('http://localhost:8060/api/user/ai-credentials', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        provider: 'test-provider',
        label: 'Test provider main',
        apiKey: 'x'.repeat(9000),
      }),
    });

    await expect(parseLimitedJsonBody(request, saveApiCredentialSchema)).rejects.toMatchObject({
      code: BYOK_ERROR_CODE.INVALID_REQUEST,
      status: 413,
    });
  });

  it('does not fall back to BYOK_ALLOWED_ORIGINS env when system settings are empty', async () => {
    mockSystemSettings.byokAllowedOrigins = '';
    process.env.BYOK_ALLOWED_ORIGINS = 'http://localhost:8060';
    const request = createRequest('http://localhost:8060/api/user/ai-credentials', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:8060',
      },
    });

    await expect(
      assertByokRequestSecurity(request, {
        requireJson: true,
        requireOrigin: true,
      }),
    ).rejects.toMatchObject({ code: BYOK_ERROR_CODE.FORBIDDEN });
  });

  it('rejects client-controlled ownership and provider url fields', async () => {
    const apiKey = ['sk', 'test', 'secret'].join('-');
    const saveRequest = createRequest('http://localhost:8060/api/user/ai-credentials', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        provider: 'test-provider',
        label: 'Test provider main',
        apiKey,
        credentialId: 'cred_11111111111111111111111111111111',
        userId: 'attacker',
        role: 'admin',
        redisKey: 'ai:byok:v1:any',
      }),
    });

    await expect(parseLimitedJsonBody(saveRequest, saveApiCredentialSchema)).rejects.toMatchObject({
      code: BYOK_ERROR_CODE.INVALID_REQUEST,
      status: 400,
    });

    const chatRequest = createRequest('http://localhost:8060/api/ai/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        credentialId: 'cred_11111111111111111111111111111111',
        provider: 'test-provider',
        model: 'test-model',
        baseUrl: 'https://evil.example',
        messages: [{ role: 'user', content: 'hello' }],
      }),
    });

    await expect(parseLimitedJsonBody(chatRequest, chatRequestSchema)).rejects.toMatchObject({
      code: BYOK_ERROR_CODE.INVALID_REQUEST,
      status: 400,
    });
  });

  it('trusts x-forwarded-proto only when proxy headers are explicitly trusted', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    const request = createRequest('http://localhost:8060/api/user/ai-credentials', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:8060',
        'x-forwarded-proto': 'https',
      },
    });

    await expect(
      assertByokRequestSecurity(request, {
        requireJson: true,
        requireOrigin: true,
      }),
    ).rejects.toMatchObject({ code: BYOK_ERROR_CODE.FORBIDDEN });

    vi.stubEnv('BYOK_TRUST_PROXY_HEADERS', 'true');

    await expect(
      assertByokRequestSecurity(request, {
        requireJson: true,
        requireOrigin: true,
      }),
    ).resolves.toBeUndefined();
  });
});
