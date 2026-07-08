import type { NextRequest } from 'next/server';
import { assertRateLimit } from '@/lib/ai/security/rate-limit';
import {
  assertByokRequestSecurity,
  createRequestId,
  getRequestIp,
  parseLimitedJsonBody,
} from '@/lib/ai/security/request-security';
import {
  listUserApiCredentials,
  overwriteUserApiCredential,
  saveUserApiCredential,
} from '@/lib/ai/byok/service';
import { saveOrOverwriteApiCredentialSchema } from '@/lib/ai/byok/schemas';
import { BYOK_ERROR_CODE, BYOK_SUCCESS_RESPONSE_OPTIONS } from '@/lib/ai/byok/constants';
import { ByokPublicError, toByokPublicError } from '@/lib/ai/byok/errors';
import {
  createByokErrorOptions,
  getByokErrorResponseType,
  requireByokUser,
} from '@/lib/ai/byok/route-helpers';
import { getEnabledAiProviderOptions } from '@/lib/ai/byok/provider-options';
import { getStoredAiProviderOptions } from '@/lib/ai/byok/provider-options-store';
import { createErrorResponse, createSuccessResponse } from '@/lib/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const requestId = createRequestId();

  try {
    await assertByokRequestSecurity(request);
    const userId = await requireByokUser(request, requestId, 'AI:SETTINGS:VIEW');
    const result = await listUserApiCredentials(userId);

    return createSuccessResponse(
      result.credentials,
      '操作成功',
      200,
      BYOK_SUCCESS_RESPONSE_OPTIONS,
    );
  } catch (error) {
    const publicError = toByokPublicError(error);

    return createErrorResponse(
      getByokErrorResponseType(publicError.status),
      publicError.message,
      null,
      publicError.status,
      createByokErrorOptions(requestId, publicError.code),
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId();

  try {
    await assertByokRequestSecurity(request, { requireJson: true, requireOrigin: true });
    const userId = await requireByokUser(request, requestId, 'AI:SETTINGS:MANAGE');
    const ip = getRequestIp(request);

    await assertRateLimit({
      userId,
      ip,
      route: 'POST /api/user/ai-credentials',
      limit: 10,
      windowSeconds: 60 * 60,
      requestId,
    });

    const input = await parseLimitedJsonBody(request, saveOrOverwriteApiCredentialSchema);

    if ('credentialId' in input) {
      const { credentialId, ...payload } = input;
      const result = await overwriteUserApiCredential(userId, credentialId, payload, {
        requestId,
        ip,
      });

      return createSuccessResponse(result, '操作成功', 200, BYOK_SUCCESS_RESPONSE_OPTIONS);
    }

    const providerOptions = getEnabledAiProviderOptions(await getStoredAiProviderOptions());

    if (!providerOptions.some((option) => option.value === input.provider)) {
      throw new ByokPublicError(BYOK_ERROR_CODE.UNSUPPORTED_PROVIDER, 400);
    }

    const result = await saveUserApiCredential(userId, input, { requestId, ip });

    return createSuccessResponse(result, '操作成功', 200, BYOK_SUCCESS_RESPONSE_OPTIONS);
  } catch (error) {
    const publicError = toByokPublicError(error);

    return createErrorResponse(
      getByokErrorResponseType(publicError.status),
      publicError.message,
      null,
      publicError.status,
      createByokErrorOptions(requestId, publicError.code),
    );
  }
}
