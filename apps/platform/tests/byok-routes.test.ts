import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vite-plus/test';
import { BYOK_ERROR_CODE } from '@/lib/ai/byok/constants';
import { createByokJsonResponse } from '@/lib/ai/byok/route-helpers';
import {
  GET as listAiCredentials,
  POST as saveAiCredential,
} from '@/app/api/user/ai-credentials/route';
import { POST as createChat } from '@/app/api/ai/chat/route';
import { DELETE as deleteAiCredential } from '@/app/api/user/ai-credentials/[credentialId]/route';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    systemSettings: {
      findUnique: async () => ({
        byok_allowed_origins: 'http://localhost:8060',
      }),
    },
  },
}));

function createRequest(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new Request(url, init));
}

describe('BYOK route handlers', () => {
  const apiKey = ['sk', 'test', 'secret'].join('-');
  const credentialId = 'cred_11111111111111111111111111111111';

  it('blocks unauthenticated credential list requests and disables caching', async () => {
    const response = await listAiCredentials(
      createRequest('http://localhost:8060/api/user/ai-credentials'),
    );
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(401);
    expect(body.error.code).toBe(BYOK_ERROR_CODE.UNAUTHENTICATED);
    expect(response.headers.get('Cache-Control')).toBe('no-store, max-age=0');
    expect(response.headers.get('Pragma')).toBe('no-cache');
    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('blocks unauthenticated mutation and chat requests', async () => {
    const saveResponse = await saveAiCredential(
      createRequest('http://localhost:8060/api/user/ai-credentials', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'http://localhost:8060',
        },
        body: JSON.stringify({
          provider: 'openai',
          label: 'OpenAI main',
          apiKey,
          ttlOption: '7d',
        }),
      }),
    );

    const deleteResponse = await deleteAiCredential(
      createRequest(`http://localhost:8060/api/user/ai-credentials/${credentialId}`, {
        method: 'DELETE',
        headers: { origin: 'http://localhost:8060' },
      }),
      { params: Promise.resolve({ credentialId }) },
    );

    const chatResponse = await createChat(
      createRequest('http://localhost:8060/api/ai/chat', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'http://localhost:8060',
        },
        body: JSON.stringify({
          credentialId,
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'hello' }],
        }),
      }),
    );

    expect(saveResponse.status).toBe(401);
    expect(deleteResponse.status).toBe(401);
    expect(chatResponse.status).toBe(401);
    expect(saveResponse.headers.get('Cache-Control')).toBe('no-store, max-age=0');
    expect(deleteResponse.headers.get('Cache-Control')).toBe('no-store, max-age=0');
    expect(chatResponse.headers.get('Cache-Control')).toBe('no-store, max-age=0');
  });

  it('rejects oversized save requests before authentication', async () => {
    const response = await saveAiCredential(
      createRequest('http://localhost:8060/api/user/ai-credentials', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': '9000',
          origin: 'http://localhost:8060',
        },
        body: JSON.stringify({
          provider: 'openai',
          label: 'OpenAI main',
          apiKey: 'x'.repeat(9000),
        }),
      }),
    );
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(413);
    expect(body.error.code).toBe(BYOK_ERROR_CODE.INVALID_REQUEST);
    expect(response.headers.get('Cache-Control')).toBe('no-store, max-age=0');
  });

  it('creates BYOK JSON responses without wildcard CORS', async () => {
    const response = createByokJsonResponse({ credentials: [] });

    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(response.headers.get('Cache-Control')).toBe('no-store, max-age=0');
  });
});
