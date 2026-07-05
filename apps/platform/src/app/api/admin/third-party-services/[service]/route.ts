import type { NextRequest } from 'next/server';
import {
  DATA_ERROR,
  createErrorResponse,
  createSuccessResponse,
  withApiHandler,
  type ApiContext,
  type ApiHandler,
} from '@/lib/server';
import { normalizeThirdPartyServiceOptions } from '@/lib/third-party-service-options/options';
import {
  deleteStoredThirdPartyServiceOption,
  getServiceOptionsStorageErrorMessage,
  getStoredThirdPartyServiceOption,
  updateStoredThirdPartyServiceOption,
} from '@/lib/third-party-service-options/store';

async function getServiceValue(context: ApiContext): Promise<string | null> {
  const params = await context.params;
  const service = params?.service;
  const value = Array.isArray(service) ? service[0] : service;

  return value?.trim() || null;
}

function isThirdPartyServiceNotFound(error: unknown): boolean {
  return error instanceof Error && error.message === 'THIRD_PARTY_SERVICE_NOT_FOUND';
}

function isDuplicateThirdPartyService(error: unknown): boolean {
  return error instanceof Error && error.message === 'THIRD_PARTY_SERVICE_DUPLICATE';
}

const getThirdPartyServiceHandler: ApiHandler = async (
  _request: NextRequest,
  context: ApiContext,
) => {
  const serviceValue = await getServiceValue(context);

  if (!serviceValue) {
    return createErrorResponse(DATA_ERROR.VALIDATION_FAILED, 'URL 中缺少服务标识', null, 400);
  }

  try {
    const serviceOption = await getStoredThirdPartyServiceOption(serviceValue);

    if (!serviceOption) {
      return createErrorResponse(DATA_ERROR.NOT_FOUND, '第三方服务不存在', null, 404);
    }

    return createSuccessResponse(serviceOption, '第三方服务详情查询成功');
  } catch (error) {
    return createErrorResponse(
      DATA_ERROR.QUERY_FAILED,
      getServiceOptionsStorageErrorMessage(error, '第三方服务详情查询失败'),
      error,
      500,
    );
  }
};

const updateThirdPartyServiceHandler: ApiHandler = async (
  request: NextRequest,
  context: ApiContext,
) => {
  const serviceValue = await getServiceValue(context);

  if (!serviceValue) {
    return createErrorResponse(DATA_ERROR.VALIDATION_FAILED, 'URL 中缺少服务标识', null, 400);
  }

  let payload: unknown;
  let serviceOption: IThirdPartyServiceOptions.ServiceOption;

  try {
    payload = await request.json();
  } catch (error) {
    return createErrorResponse(DATA_ERROR.VALIDATION_FAILED, '请求 JSON 格式无效', error, 400);
  }

  try {
    [serviceOption] = normalizeThirdPartyServiceOptions([payload]);
  } catch (error) {
    return createErrorResponse(
      DATA_ERROR.VALIDATION_FAILED,
      error instanceof Error ? error.message : '第三方服务配置无效',
      error,
      422,
    );
  }

  try {
    await updateStoredThirdPartyServiceOption(serviceValue, serviceOption);

    return createSuccessResponse(
      await getStoredThirdPartyServiceOption(serviceOption.value),
      '第三方服务更新成功',
    );
  } catch (error) {
    if (isThirdPartyServiceNotFound(error)) {
      return createErrorResponse(DATA_ERROR.NOT_FOUND, '第三方服务不存在', error, 404);
    }

    if (isDuplicateThirdPartyService(error)) {
      return createErrorResponse(DATA_ERROR.DUPLICATE_ENTRY, '第三方服务标识必须唯一', error, 409);
    }

    return createErrorResponse(
      DATA_ERROR.UPDATE_FAILED,
      getServiceOptionsStorageErrorMessage(error, '第三方服务更新失败'),
      error,
      400,
    );
  }
};

const deleteThirdPartyServiceHandler: ApiHandler = async (
  _request: NextRequest,
  context: ApiContext,
) => {
  const serviceValue = await getServiceValue(context);

  if (!serviceValue) {
    return createErrorResponse(DATA_ERROR.VALIDATION_FAILED, 'URL 中缺少服务标识', null, 400);
  }

  try {
    await deleteStoredThirdPartyServiceOption(serviceValue);

    return createSuccessResponse({ value: serviceValue }, '第三方服务删除成功');
  } catch (error) {
    if (isThirdPartyServiceNotFound(error)) {
      return createErrorResponse(DATA_ERROR.NOT_FOUND, '第三方服务不存在', error, 404);
    }

    return createErrorResponse(
      DATA_ERROR.DELETE_FAILED,
      getServiceOptionsStorageErrorMessage(error, '第三方服务删除失败'),
      error,
      400,
    );
  }
};

export const GET = withApiHandler(getThirdPartyServiceHandler);
export const PUT = withApiHandler(updateThirdPartyServiceHandler);
export const DELETE = withApiHandler(deleteThirdPartyServiceHandler);
