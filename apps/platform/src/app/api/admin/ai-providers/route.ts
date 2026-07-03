import type { NextRequest } from 'next/server';
import {
  DATA_ERROR,
  createErrorResponse,
  createSuccessResponse,
  withApiHandler,
  type ApiHandler,
} from '@/lib/server';
import { normalizeAiProviderOptions } from '@/lib/ai/byok/provider-options';
import {
  getProviderOptionsStorageErrorMessage,
  getStoredAiProviderOptions,
  updateStoredAiProviderOptions,
} from '@/lib/ai/byok/provider-options-store';

type AiProviderPayload = ISettingsApi.AiProviderPayload;

const getAiProvidersHandler: ApiHandler = async () => {
  try {
    const providerOptions = await getStoredAiProviderOptions();

    return createSuccessResponse(providerOptions, 'AI Provider 配置查询成功');
  } catch (error) {
    return createErrorResponse(
      DATA_ERROR.QUERY_FAILED,
      getProviderOptionsStorageErrorMessage(error, 'AI Provider 配置查询失败'),
      error,
      500,
    );
  }
};

const updateAiProvidersHandler: ApiHandler = async (request: NextRequest) => {
  let payload: AiProviderPayload;

  try {
    payload = (await request.json()) as AiProviderPayload;
  } catch (error) {
    return createErrorResponse(DATA_ERROR.VALIDATION_FAILED, '请求 JSON 格式无效', error, 400);
  }

  try {
    const providerOptions = normalizeAiProviderOptions(payload.options);

    await updateStoredAiProviderOptions(providerOptions);

    return createSuccessResponse(await getStoredAiProviderOptions(), 'AI Provider 配置更新成功');
  } catch (error) {
    return createErrorResponse(
      DATA_ERROR.UPDATE_FAILED,
      getProviderOptionsStorageErrorMessage(error, 'AI Provider 配置更新失败'),
      error,
      400,
    );
  }
};

export const GET = withApiHandler(getAiProvidersHandler);
export const PUT = withApiHandler(updateAiProvidersHandler);
