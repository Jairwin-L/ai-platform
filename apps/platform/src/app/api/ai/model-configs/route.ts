import type { NextRequest } from 'next/server';
import {
  createAiErrorResponse,
  createAiSuccessResponse,
  getAiRequestId,
  parseJsonBySchema,
  requireAiUser,
} from '@/lib/ai/route-helpers';
import { modelConfigCreateSchema } from '@/lib/ai/schemas';
import { createModelConfig, listModelConfigs } from '@/lib/ai/service';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const requestId = getAiRequestId();

  try {
    const userId = await requireAiUser(request, requestId, 'AI:SETTINGS:VIEW');

    return createAiSuccessResponse(await listModelConfigs(userId));
  } catch (error) {
    return createAiErrorResponse(error, requestId);
  }
}

export async function POST(request: NextRequest) {
  const requestId = getAiRequestId();

  try {
    const userId = await requireAiUser(request, requestId, 'AI:SETTINGS:MANAGE');
    const input = await parseJsonBySchema(request, modelConfigCreateSchema);

    return createAiSuccessResponse(await createModelConfig(userId, input), '模型配置创建成功');
  } catch (error) {
    return createAiErrorResponse(error, requestId);
  }
}
