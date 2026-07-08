import type { NextRequest } from 'next/server';
import { defaultModelConfigSchema } from '@/lib/ai/byok/schemas';
import { saveStoredDefaultModelConfig } from '@/lib/ai/byok/key-store';
import { listModelConfigs } from '@/lib/ai/service';
import {
  createByokErrorOptions,
  getByokErrorResponseType,
  requireByokUser,
} from '@/lib/ai/byok/route-helpers';
import { BYOK_ERROR_CODE, BYOK_SUCCESS_RESPONSE_OPTIONS } from '@/lib/ai/byok/constants';
import { toByokPublicError } from '@/lib/ai/byok/errors';
import {
  assertByokRequestSecurity,
  createRequestId,
  parseLimitedJsonBody,
} from '@/lib/ai/security/request-security';
import { createErrorResponse, createSuccessResponse } from '@/lib/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const requestId = createRequestId();

  try {
    await assertByokRequestSecurity(request, { requireJson: true, requireOrigin: true });
    const userId = await requireByokUser(request, requestId, 'AI:SETTINGS:MANAGE');
    const input = await parseLimitedJsonBody(request, defaultModelConfigSchema);
    const modelConfigs = await listModelConfigs(userId);
    const selectedModelConfig = modelConfigs.find(
      (modelConfig) =>
        modelConfig.providerConfigId === input.credentialId &&
        modelConfig.modelId === input.modelId,
    );

    if (!selectedModelConfig) {
      return createErrorResponse(
        getByokErrorResponseType(400),
        '模型不可用。',
        null,
        400,
        createByokErrorOptions(requestId, BYOK_ERROR_CODE.INVALID_REQUEST),
      );
    }

    return createSuccessResponse(
      await saveStoredDefaultModelConfig(userId, input),
      '默认模型配置更新成功',
      200,
      BYOK_SUCCESS_RESPONSE_OPTIONS,
    );
  } catch (error) {
    const publicError = toByokPublicError(error);

    return createErrorResponse(
      getByokErrorResponseType(publicError.status),
      publicError.message,
      null,
      publicError.status,
      createByokErrorOptions(requestId, publicError.code),
    );
  }
}
