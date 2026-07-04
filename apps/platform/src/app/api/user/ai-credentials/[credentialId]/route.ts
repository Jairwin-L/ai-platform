import type { NextRequest } from 'next/server';
import { assertRateLimit } from '@/lib/ai/security/rate-limit';
import {
  assertByokRequestSecurity,
  createRequestId,
  getRequestIp,
} from '@/lib/ai/security/request-security';
import { credentialIdSchema } from '@/lib/ai/byok/schemas';
import { deleteUserApiCredential } from '@/lib/ai/byok/service';
import {
  createByokErrorResponse,
  createByokJsonResponse,
  requireByokUser,
} from '@/lib/ai/byok/route-helpers';
import { BYOK_ERROR_CODE } from '@/lib/ai/byok/constants';
import { ByokPublicError } from '@/lib/ai/byok/errors';

export const runtime = 'nodejs';

export async function DELETE(request: NextRequest, context: IRouteApi.AiCredentialRouteContext) {
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
      route: 'DELETE /api/user/ai-credentials/[credentialId]',
      limit: 20,
      windowSeconds: 60 * 60,
      requestId,
    });

    const result = await deleteUserApiCredential(userId, parsedCredentialId.data, {
      requestId,
      ip,
    });

    return createByokJsonResponse(result);
  } catch (error) {
    return createByokErrorResponse(error, requestId);
  }
}
