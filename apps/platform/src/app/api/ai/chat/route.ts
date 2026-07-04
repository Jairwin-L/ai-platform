import type { NextRequest } from 'next/server';
import { assertRateLimit, runWithConcurrencyLimit } from '@/lib/ai/security/rate-limit';
import {
  assertByokRequestSecurity,
  createRequestId,
  getRequestIp,
  parseLimitedJsonBody,
} from '@/lib/ai/security/request-security';
import { chatRequestSchema } from '@/lib/ai/byok/schemas';
import { createByokChatCompletion } from '@/lib/ai/byok/service';
import { createByokErrorResponse, requireByokUser } from '@/lib/ai/byok/route-helpers';
import { BYOK_CHAT_LIMITS, BYOK_SUCCESS_RESPONSE_OPTIONS } from '@/lib/ai/byok/constants';
import { createSuccessResponse } from '@/lib/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const requestId = createRequestId();

  try {
    await assertByokRequestSecurity(request, { requireJson: true, requireOrigin: true });
    const userId = await requireByokUser(request, requestId);
    const ip = getRequestIp(request);

    await assertRateLimit({
      userId,
      ip,
      route: 'POST /api/ai/chat',
      limit: BYOK_CHAT_LIMITS.maxHourlyRequests,
      windowSeconds: 60 * 60,
      requestId,
    });

    await assertRateLimit({
      userId,
      ip,
      route: 'POST /api/ai/chat:daily',
      limit: BYOK_CHAT_LIMITS.maxDailyRequests,
      windowSeconds: 60 * 60 * 24,
      requestId,
    });

    const input = await parseLimitedJsonBody(request, chatRequestSchema);
    const result = await runWithConcurrencyLimit(
      {
        userId,
        ip,
        route: 'POST /api/ai/chat',
        limit: BYOK_CHAT_LIMITS.maxConcurrentRequests,
        ttlSeconds: 60,
        requestId,
      },
      () => createByokChatCompletion(userId, input, { requestId, ip }),
    );

    return createSuccessResponse(result, '操作成功', 200, BYOK_SUCCESS_RESPONSE_OPTIONS);
  } catch (error) {
    return createByokErrorResponse(error, requestId);
  }
}
