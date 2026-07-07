import type { NextRequest } from 'next/server';
import {
  createAiErrorResponse,
  createAiSuccessResponse,
  getAiRequestId,
  parseJsonBySchema,
  requireAiUser,
} from '@/lib/ai/route-helpers';
import { modelConfigUpdateSchema } from '@/lib/ai/schemas';
import { deleteModelConfig, updateModelConfig } from '@/lib/ai/service';

export const runtime = 'nodejs';

export async function PATCH(request: NextRequest, context: IRouteApi.IdRouteContext) {
  const requestId = getAiRequestId();

  try {
    const userId = await requireAiUser(request, requestId);
    const { id } = await context.params;
    const input = await parseJsonBySchema(request, modelConfigUpdateSchema);

    return createAiSuccessResponse(await updateModelConfig(userId, id, input), '模型配置更新成功');
  } catch (error) {
    return createAiErrorResponse(error, requestId);
  }
}

export async function DELETE(request: NextRequest, context: IRouteApi.IdRouteContext) {
  const requestId = getAiRequestId();

  try {
    const userId = await requireAiUser(request, requestId);
    const { id } = await context.params;

    await deleteModelConfig(userId, id);

    return createAiSuccessResponse({ deleted: true }, '模型配置删除成功');
  } catch (error) {
    return createAiErrorResponse(error, requestId);
  }
}
