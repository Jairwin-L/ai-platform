import type { NextRequest } from 'next/server';
import { createByokErrorResponse, requireByokUser } from '@/lib/ai/byok/route-helpers';
import { assertRateLimit } from '@/lib/ai/security/rate-limit';
import {
  assertByokRequestSecurity,
  createRequestId,
  getRequestIp,
  parseLimitedJsonBody,
} from '@/lib/ai/security/request-security';
import { saveOrOverwriteCredentialSchema } from '@/lib/third-party-service-credentials/schemas';
import {
  listUserThirdPartyServiceCredentials,
  overwriteUserThirdPartyServiceCredential,
  saveUserThirdPartyServiceCredential,
} from '@/lib/third-party-service-credentials/service';
import { ByokPublicError } from '@/lib/ai/byok/errors';
import { BYOK_ERROR_CODE, BYOK_SUCCESS_RESPONSE_OPTIONS } from '@/lib/ai/byok/constants';
import { getEnabledThirdPartyServiceOptions } from '@/lib/third-party-service-options/options';
import { getStoredThirdPartyServiceOptions } from '@/lib/third-party-service-options/store';
import { createSuccessResponse } from '@/lib/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const requestId = createRequestId();

  try {
    await assertByokRequestSecurity(request);
    const userId = await requireByokUser(request, requestId);
    const result = await listUserThirdPartyServiceCredentials(userId);

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
      route: 'POST /api/user/third-party-service',
      limit: 10,
      windowSeconds: 60 * 60,
      requestId,
    });

    const input = await parseLimitedJsonBody(request, saveOrOverwriteCredentialSchema);

    if ('credentialId' in input) {
      const { credentialId, ...payload } = input;
      const result = await overwriteUserThirdPartyServiceCredential(userId, credentialId, payload, {
        requestId,
        ip,
      });

      return createSuccessResponse(result, '操作成功', 200, BYOK_SUCCESS_RESPONSE_OPTIONS);
    }

    const serviceOptions = getEnabledThirdPartyServiceOptions(
      await getStoredThirdPartyServiceOptions(),
    );

    if (!serviceOptions.some((option) => option.value === input.serviceName)) {
      throw new ByokPublicError(BYOK_ERROR_CODE.INVALID_REQUEST, 400, '暂不支持该第三方服务。');
    }

    const result = await saveUserThirdPartyServiceCredential(userId, input, { requestId, ip });

    return createSuccessResponse(result, '操作成功', 200, BYOK_SUCCESS_RESPONSE_OPTIONS);
  } catch (error) {
    return createByokErrorResponse(error, requestId);
  }
}
