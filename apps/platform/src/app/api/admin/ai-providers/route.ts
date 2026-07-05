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
  createStoredAiProviderOption,
  getProviderOptionsStorageErrorMessage,
  getStoredAiProviderOptions,
  getStoredAiProviderOption,
  updateStoredAiProviderOptions,
} from '@/lib/ai/byok/provider-options-store';

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
  let payload: ISettingsApi.AiProviderPayload;
  let providerOptions: IByok.AiProviderOption[];

  try {
    payload = (await request.json()) as ISettingsApi.AiProviderPayload;
  } catch (error) {
    return createErrorResponse(DATA_ERROR.VALIDATION_FAILED, '请求 JSON 格式无效', error, 400);
  }

  try {
    providerOptions = normalizeAiProviderOptions(payload.options);
  } catch (error) {
    return createErrorResponse(
      DATA_ERROR.VALIDATION_FAILED,
      error instanceof Error ? error.message : 'AI Provider 配置无效',
      error,
      422,
    );
  }

  try {
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

const createAiProviderHandler: ApiHandler = async (request: NextRequest) => {
  let payload: unknown;
  let providerOption: IByok.AiProviderOption;

  try {
    payload = await request.json();
  } catch (error) {
    return createErrorResponse(DATA_ERROR.VALIDATION_FAILED, '请求 JSON 格式无效', error, 400);
  }

  try {
    [providerOption] = normalizeAiProviderOptions([payload]);
  } catch (error) {
    return createErrorResponse(
      DATA_ERROR.VALIDATION_FAILED,
      error instanceof Error ? error.message : 'AI Provider 配置无效',
      error,
      422,
    );
  }

  try {
    const existingProvider = await getStoredAiProviderOption(providerOption.value);

    if (existingProvider) {
      return createErrorResponse(DATA_ERROR.DUPLICATE_ENTRY, 'AI Provider 标识必须唯一', null, 409);
    }

    await createStoredAiProviderOption(providerOption);

    return createSuccessResponse(
      await getStoredAiProviderOption(providerOption.value),
      'AI Provider 创建成功',
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'AI_PROVIDER_DUPLICATE') {
      return createErrorResponse(
        DATA_ERROR.DUPLICATE_ENTRY,
        'AI Provider 标识必须唯一',
        error,
        409,
      );
    }

    return createErrorResponse(
      DATA_ERROR.UPDATE_FAILED,
      getProviderOptionsStorageErrorMessage(error, 'AI Provider 创建失败'),
      error,
      400,
    );
  }
};

export const GET = withApiHandler(getAiProvidersHandler);
export const POST = withApiHandler(createAiProviderHandler);
export const PUT = withApiHandler(updateAiProvidersHandler);
