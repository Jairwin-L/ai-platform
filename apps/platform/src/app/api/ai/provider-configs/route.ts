import type { NextRequest } from 'next/server';
import {
  createAiErrorResponse,
  createAiSuccessResponse,
  getAiRequestId,
  parseJsonBySchema,
  requireAiUser,
} from '@/lib/ai/route-helpers';
import { providerConfigCreateSchema } from '@/lib/ai/schemas';
import { createProviderConfig, listProviderConfigs } from '@/lib/ai/service';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const requestId = getAiRequestId();

  try {
    const userId = await requireAiUser(request, requestId);

    return createAiSuccessResponse(await listProviderConfigs(userId));
  } catch (error) {
    return createAiErrorResponse(error, requestId);
  }
}

export async function POST(request: NextRequest) {
  const requestId = getAiRequestId();

  try {
    const userId = await requireAiUser(request, requestId);
    const input = await parseJsonBySchema(request, providerConfigCreateSchema);

    return createAiSuccessResponse(await createProviderConfig(userId, input), 'Provider 创建成功');
  } catch (error) {
    return createAiErrorResponse(error, requestId);
  }
}
