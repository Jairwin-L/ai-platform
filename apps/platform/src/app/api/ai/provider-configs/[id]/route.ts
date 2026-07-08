import type { NextRequest } from 'next/server';
import {
  createAiErrorResponse,
  createAiSuccessResponse,
  getAiRequestId,
  parseJsonBySchema,
  requireAiUser,
} from '@/lib/ai/route-helpers';
import { providerConfigUpdateSchema } from '@/lib/ai/schemas';
import { deleteProviderConfig, updateProviderConfig } from '@/lib/ai/service';

export const runtime = 'nodejs';

export async function PATCH(request: NextRequest, context: IRouteApi.IdRouteContext) {
  const requestId = getAiRequestId();

  try {
    const userId = await requireAiUser(request, requestId, 'AI:SETTINGS:MANAGE');
    const { id } = await context.params;
    const input = await parseJsonBySchema(request, providerConfigUpdateSchema);

    return createAiSuccessResponse(
      await updateProviderConfig(userId, id, input),
      'Provider 更新成功',
    );
  } catch (error) {
    return createAiErrorResponse(error, requestId);
  }
}

export async function DELETE(request: NextRequest, context: IRouteApi.IdRouteContext) {
  const requestId = getAiRequestId();

  try {
    const userId = await requireAiUser(request, requestId, 'AI:SETTINGS:MANAGE');
    const { id } = await context.params;

    await deleteProviderConfig(userId, id);

    return createAiSuccessResponse({ deleted: true }, 'Provider 删除成功');
  } catch (error) {
    return createAiErrorResponse(error, requestId);
  }
}
