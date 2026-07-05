import type { NextRequest } from 'next/server';
import {
  DATA_ERROR,
  createErrorResponse,
  createSuccessResponse,
  withApiHandler,
  type ApiContext,
  type ApiHandler,
} from '@/lib/server';
import { normalizeAiProviderOptions } from '@/lib/ai/byok/provider-options';
import {
  deleteStoredAiProviderOption,
  getProviderOptionsStorageErrorMessage,
  getStoredAiProviderOption,
  updateStoredAiProviderOption,
} from '@/lib/ai/byok/provider-options-store';

async function getProviderValue(context: ApiContext): Promise<string | null> {
  const params = await context.params;
  const provider = params?.provider;
  const value = Array.isArray(provider) ? provider[0] : provider;

  return value?.trim() || null;
}

function isAiProviderNotFound(error: unknown): boolean {
  return error instanceof Error && error.message === 'AI_PROVIDER_NOT_FOUND';
}

function isDuplicateAiProvider(error: unknown): boolean {
  return error instanceof Error && error.message === 'AI_PROVIDER_DUPLICATE';
}

const getAiProviderHandler: ApiHandler = async (_request: NextRequest, context: ApiContext) => {
  const providerValue = await getProviderValue(context);

  if (!providerValue) {
    return createErrorResponse(DATA_ERROR.VALIDATION_FAILED, 'URL 中缺少 Provider 标识', null, 400);
  }

  try {
    const providerOption = await getStoredAiProviderOption(providerValue);

    if (!providerOption) {
      return createErrorResponse(DATA_ERROR.NOT_FOUND, 'AI Provider 不存在', null, 404);
    }

    return createSuccessResponse(providerOption, 'AI Provider 详情查询成功');
  } catch (error) {
    return createErrorResponse(
      DATA_ERROR.QUERY_FAILED,
      getProviderOptionsStorageErrorMessage(error, 'AI Provider 详情查询失败'),
      error,
      500,
    );
  }
};

const updateAiProviderHandler: ApiHandler = async (request: NextRequest, context: ApiContext) => {
  const providerValue = await getProviderValue(context);

  if (!providerValue) {
    return createErrorResponse(DATA_ERROR.VALIDATION_FAILED, 'URL 中缺少 Provider 标识', null, 400);
  }

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
    await updateStoredAiProviderOption(providerValue, providerOption);

    return createSuccessResponse(
      await getStoredAiProviderOption(providerOption.value),
      'AI Provider 更新成功',
    );
  } catch (error) {
    if (isAiProviderNotFound(error)) {
      return createErrorResponse(DATA_ERROR.NOT_FOUND, 'AI Provider 不存在', error, 404);
    }

    if (isDuplicateAiProvider(error)) {
      return createErrorResponse(
        DATA_ERROR.DUPLICATE_ENTRY,
        'AI Provider 标识必须唯一',
        error,
        409,
      );
    }

    return createErrorResponse(
      DATA_ERROR.UPDATE_FAILED,
      getProviderOptionsStorageErrorMessage(error, 'AI Provider 更新失败'),
      error,
      400,
    );
  }
};

const deleteAiProviderHandler: ApiHandler = async (_request: NextRequest, context: ApiContext) => {
  const providerValue = await getProviderValue(context);

  if (!providerValue) {
    return createErrorResponse(DATA_ERROR.VALIDATION_FAILED, 'URL 中缺少 Provider 标识', null, 400);
  }

  try {
    await deleteStoredAiProviderOption(providerValue);

    return createSuccessResponse({ value: providerValue }, 'AI Provider 删除成功');
  } catch (error) {
    if (isAiProviderNotFound(error)) {
      return createErrorResponse(DATA_ERROR.NOT_FOUND, 'AI Provider 不存在', error, 404);
    }

    return createErrorResponse(
      DATA_ERROR.DELETE_FAILED,
      getProviderOptionsStorageErrorMessage(error, 'AI Provider 删除失败'),
      error,
      400,
    );
  }
};

export const GET = withApiHandler(getAiProviderHandler);
export const PUT = withApiHandler(updateAiProviderHandler);
export const DELETE = withApiHandler(deleteAiProviderHandler);
