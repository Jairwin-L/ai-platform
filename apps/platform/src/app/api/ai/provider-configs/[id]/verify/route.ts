import type { NextRequest } from 'next/server';
import {
  createAiErrorResponse,
  createAiSuccessResponse,
  getAiRequestId,
  requireAiUser,
} from '@/lib/ai/route-helpers';
import { verifyProviderConfig } from '@/lib/ai/service';

export const runtime = 'nodejs';

export async function POST(request: NextRequest, context: IRouteApi.IdRouteContext) {
  const requestId = getAiRequestId();

  try {
    const userId = await requireAiUser(request, requestId);
    const { id } = await context.params;

    return createAiSuccessResponse(await verifyProviderConfig(userId, id), 'Provider 验证完成');
  } catch (error) {
    return createAiErrorResponse(error, requestId);
  }
}
