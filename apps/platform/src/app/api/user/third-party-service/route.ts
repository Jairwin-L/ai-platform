import type { NextRequest } from 'next/server';
import {
  createByokErrorResponse,
  createByokJsonResponse,
  requireByokUser,
} from '@/lib/ai/byok/route-helpers';
import { assertRateLimit } from '@/lib/ai/security/rate-limit';
import {
  assertByokRequestSecurity,
  createRequestId,
  getRequestIp,
  parseLimitedJsonBody,
} from '@/lib/ai/security/request-security';
import { saveCredentialSchema } from '@/lib/third-party-service-credentials/schemas';
import {
  listUserThirdPartyServiceCredentials,
  saveUserThirdPartyServiceCredential,
} from '@/lib/third-party-service-credentials/service';
import { ByokPublicError } from '@/lib/ai/byok/errors';
import { BYOK_ERROR_CODE } from '@/lib/ai/byok/constants';
import { getEnabledThirdPartyServiceOptions } from '@/lib/third-party-service-options/options';
import { getStoredThirdPartyServiceOptions } from '@/lib/third-party-service-options/store';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const requestId = createRequestId();

  try {
    await assertByokRequestSecurity(request);
    const userId = await requireByokUser(request, requestId);
    const result = await listUserThirdPartyServiceCredentials(userId);

    return createByokJsonResponse(result.credentials);
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

    const input = await parseLimitedJsonBody(request, saveCredentialSchema);

    const serviceOptions = getEnabledThirdPartyServiceOptions(
      await getStoredThirdPartyServiceOptions(),
    );

    if (!serviceOptions.some((option) => option.value === input.serviceName)) {
      throw new ByokPublicError(BYOK_ERROR_CODE.INVALID_REQUEST, 400, '暂不支持该第三方服务。');
    }

    const result = await saveUserThirdPartyServiceCredential(userId, input, { requestId, ip });

    return createByokJsonResponse(result);
  } catch (error) {
    return createByokErrorResponse(error, requestId);
  }
}
