import type { NextRequest } from 'next/server';
import {
  createAiErrorResponse,
  createAiSuccessResponse,
  getAiRequestId,
  requireAiUser,
} from '@/lib/ai/route-helpers';
import { getConversationMessages } from '@/lib/ai/service';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, context: IRouteApi.IdRouteContext) {
  const requestId = getAiRequestId();

  try {
    const userId = await requireAiUser(request, requestId);
    const { id } = await context.params;

    return createAiSuccessResponse(await getConversationMessages(userId, id));
  } catch (error) {
    return createAiErrorResponse(error, requestId);
  }
}
