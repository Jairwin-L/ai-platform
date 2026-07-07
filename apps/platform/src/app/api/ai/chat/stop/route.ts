import type { NextRequest } from 'next/server';
import {
  createAiErrorResponse,
  createAiSuccessResponse,
  getAiRequestId,
  parseJsonBySchema,
  requireAiUser,
} from '@/lib/ai/route-helpers';
import { chatStopSchema } from '@/lib/ai/schemas';
import { stopAssistantMessage } from '@/lib/ai/service';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const requestId = getAiRequestId();

  try {
    const userId = await requireAiUser(request, requestId);
    const input = await parseJsonBySchema(request, chatStopSchema);

    await stopAssistantMessage(userId, input);

    return createAiSuccessResponse({ stopped: true }, '生成已停止');
  } catch (error) {
    return createAiErrorResponse(error, requestId);
  }
}
