import {
  DATA_ERROR,
  createErrorResponse,
  createSuccessResponse,
  withApiHandler,
  type ApiHandler,
} from '@/lib/server';
import { getPublicAiProviderOptions } from '@/lib/ai/byok/provider-options';
import {
  getProviderOptionsStorageErrorMessage,
  getStoredAiProviderOptions,
} from '@/lib/ai/byok/provider-options-store';

const getAiProviderOptionsHandler: ApiHandler = async () => {
  try {
    const providerOptions = getPublicAiProviderOptions(await getStoredAiProviderOptions());

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

export const GET = withApiHandler(getAiProviderOptionsHandler);
