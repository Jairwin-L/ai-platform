import type { NextRequest } from 'next/server';
import { BYOK_ERROR_CODE } from '@/lib/ai/byok/constants';
import { ByokPublicError } from '@/lib/ai/byok/errors';
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
} from '@/lib/ai/security/request-security';
import { credentialIdSchema } from '@/lib/third-party-service-credentials/schemas';
import { deleteUserThirdPartyServiceCredential } from '@/lib/third-party-service-credentials/service';

export const runtime = 'nodejs';

export async function DELETE(
  request: NextRequest,
  context: IRouteApi.ThirdPartyServiceCredentialRouteContext,
) {
  const requestId = createRequestId();

  try {
    await assertByokRequestSecurity(request, { requireOrigin: true });
    const userId = await requireByokUser(request, requestId);
    const ip = getRequestIp(request);
    const params = await context.params;
    const parsedCredentialId = credentialIdSchema.safeParse(params.credentialId);

    if (!parsedCredentialId.success) {
      throw new ByokPublicError(BYOK_ERROR_CODE.INVALID_REQUEST, 400);
    }

    await assertRateLimit({
      userId,
      ip,
      route: 'DELETE /api/user/third-party-service/[credentialId]',
      limit: 20,
      windowSeconds: 60 * 60,
      requestId,
    });

    const result = await deleteUserThirdPartyServiceCredential(userId, parsedCredentialId.data, {
      requestId,
      ip,
    });

    return createByokJsonResponse(result);
  } catch (error) {
    return createByokErrorResponse(error, requestId);
  }
}
