import type { NextRequest } from 'next/server';
import {
  createAiErrorResponse,
  createAiSuccessResponse,
  getAiRequestId,
  parseJsonBySchema,
  requireAiUser,
} from '@/lib/ai/route-helpers';
import { conversationUpdateSchema } from '@/lib/ai/schemas';
import { deleteConversation, updateConversation } from '@/lib/ai/service';

export const runtime = 'nodejs';

export async function PATCH(request: NextRequest, context: IRouteApi.IdRouteContext) {
  const requestId = getAiRequestId();

  try {
    const userId = await requireAiUser(request, requestId);
    const { id } = await context.params;
    const input = await parseJsonBySchema(request, conversationUpdateSchema);

    return createAiSuccessResponse(await updateConversation(userId, id, input), '会话更新成功');
  } catch (error) {
    return createAiErrorResponse(error, requestId);
  }
}

export async function DELETE(request: NextRequest, context: IRouteApi.IdRouteContext) {
  const requestId = getAiRequestId();

  try {
    const userId = await requireAiUser(request, requestId);
    const { id } = await context.params;

    await deleteConversation(userId, id);

    return createAiSuccessResponse({ deleted: true }, '会话删除成功');
  } catch (error) {
    return createAiErrorResponse(error, requestId);
  }
}
