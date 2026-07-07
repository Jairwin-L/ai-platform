import type { NextRequest } from 'next/server';
import {
  createAiErrorResponse,
  createAiSuccessResponse,
  getAiRequestId,
  parseJsonBySchema,
  requireAiUser,
} from '@/lib/ai/route-helpers';
import { conversationCreateSchema, conversationListQuerySchema } from '@/lib/ai/schemas';
import { createConversation, listConversations } from '@/lib/ai/service';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const requestId = getAiRequestId();

  try {
    const userId = await requireAiUser(request, requestId);
    const query = conversationListQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );

    return createAiSuccessResponse(await listConversations(userId, query));
  } catch (error) {
    return createAiErrorResponse(error, requestId);
  }
}

export async function POST(request: NextRequest) {
  const requestId = getAiRequestId();

  try {
    const userId = await requireAiUser(request, requestId);
    const input = await parseJsonBySchema(request, conversationCreateSchema);

    return createAiSuccessResponse(await createConversation(userId, input), '会话创建成功');
  } catch (error) {
    return createAiErrorResponse(error, requestId);
  }
}
