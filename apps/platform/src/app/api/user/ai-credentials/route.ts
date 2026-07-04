import type { NextRequest } from 'next/server';
import { assertRateLimit } from '@/lib/ai/security/rate-limit';
import {
  assertByokRequestSecurity,
  createRequestId,
  getRequestIp,
  parseLimitedJsonBody,
} from '@/lib/ai/security/request-security';
import { listUserApiCredentials, saveUserApiCredential } from '@/lib/ai/byok/service';
import { saveApiCredentialSchema } from '@/lib/ai/byok/schemas';
import { BYOK_ERROR_CODE, BYOK_SUCCESS_RESPONSE_OPTIONS } from '@/lib/ai/byok/constants';
import { ByokPublicError } from '@/lib/ai/byok/errors';
import { createByokErrorResponse, requireByokUser } from '@/lib/ai/byok/route-helpers';
import { getEnabledAiProviderOptions } from '@/lib/ai/byok/provider-options';
import { getStoredAiProviderOptions } from '@/lib/ai/byok/provider-options-store';
import { createSuccessResponse } from '@/lib/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const requestId = createRequestId();

  try {
    await assertByokRequestSecurity(request);
    const userId = await requireByokUser(request, requestId);
    const result = await listUserApiCredentials(userId);

    return createSuccessResponse(
      result.credentials,
      '操作成功',
      200,
      BYOK_SUCCESS_RESPONSE_OPTIONS,
    );
  } catch (error) {
    return createByokErrorResponse(error, requestId);
  }
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId();

  try {
    await assertByokRequestSecurity(request, { requireJson: true, requireOrigin: true });
    const userId = await requireByokUser(request, requestId);
    const ip = getRequestIp(request);

    await assertRateLimit({
      userId,
      ip,
      route: 'POST /api/user/ai-credentials',
      limit: 10,
      windowSeconds: 60 * 60,
      requestId,
    });

    const input = await parseLimitedJsonBody(request, saveApiCredentialSchema);
    const providerOptions = getEnabledAiProviderOptions(await getStoredAiProviderOptions());

    if (!providerOptions.some((option) => option.value === input.provider)) {
      throw new ByokPublicError(BYOK_ERROR_CODE.UNSUPPORTED_PROVIDER, 400);
    }

    const result = await saveUserApiCredential(userId, input, { requestId, ip });

    return createSuccessResponse(result, '操作成功', 200, BYOK_SUCCESS_RESPONSE_OPTIONS);
  } catch (error) {
    return createByokErrorResponse(error, requestId);
  }
}
