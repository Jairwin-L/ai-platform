import type { NextRequest } from 'next/server';
import {
  DATA_ERROR,
  createErrorResponse,
  createSuccessResponse,
  withApiHandler,
  type ApiHandler,
} from '@/lib/server';
import { normalizeThirdPartyServiceOptions } from '@/lib/third-party-service-options/options';
import {
  createStoredThirdPartyServiceOption,
  getServiceOptionsStorageErrorMessage,
  getStoredThirdPartyServiceOptions,
  getStoredThirdPartyServiceOption,
  updateStoredThirdPartyServiceOptions,
} from '@/lib/third-party-service-options/store';

const getThirdPartyServicesHandler: ApiHandler = async () => {
  try {
    const serviceOptions = await getStoredThirdPartyServiceOptions();

    return createSuccessResponse(serviceOptions, '第三方服务配置查询成功');
  } catch (error) {
    return createErrorResponse(
      DATA_ERROR.QUERY_FAILED,
      getServiceOptionsStorageErrorMessage(error, '第三方服务配置查询失败'),
      error,
      500,
    );
  }
};

const updateThirdPartyServicesHandler: ApiHandler = async (request: NextRequest) => {
  let payload: ISettingsApi.ThirdPartyServicePayload;
  let serviceOptions: IThirdPartyServiceOptions.ServiceOption[];

  try {
    payload = (await request.json()) as ISettingsApi.ThirdPartyServicePayload;
  } catch (error) {
    return createErrorResponse(DATA_ERROR.VALIDATION_FAILED, '请求 JSON 格式无效', error, 400);
  }

  try {
    serviceOptions = normalizeThirdPartyServiceOptions(payload.options);
  } catch (error) {
    return createErrorResponse(
      DATA_ERROR.VALIDATION_FAILED,
      error instanceof Error ? error.message : '第三方服务配置无效',
      error,
      422,
    );
  }

  try {
    await updateStoredThirdPartyServiceOptions(serviceOptions);

    return createSuccessResponse(
      await getStoredThirdPartyServiceOptions(),
      '第三方服务配置更新成功',
    );
  } catch (error) {
    return createErrorResponse(
      DATA_ERROR.UPDATE_FAILED,
      getServiceOptionsStorageErrorMessage(error, '第三方服务配置更新失败'),
      error,
      400,
    );
  }
};

const createThirdPartyServiceHandler: ApiHandler = async (request: NextRequest) => {
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
    const existingService = await getStoredThirdPartyServiceOption(serviceOption.value);

    if (existingService) {
      return createErrorResponse(DATA_ERROR.DUPLICATE_ENTRY, '第三方服务标识必须唯一', null, 409);
    }

    await createStoredThirdPartyServiceOption(serviceOption);

    return createSuccessResponse(
      await getStoredThirdPartyServiceOption(serviceOption.value),
      '第三方服务创建成功',
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'THIRD_PARTY_SERVICE_DUPLICATE') {
      return createErrorResponse(DATA_ERROR.DUPLICATE_ENTRY, '第三方服务标识必须唯一', error, 409);
    }

    return createErrorResponse(
      DATA_ERROR.UPDATE_FAILED,
      getServiceOptionsStorageErrorMessage(error, '第三方服务创建失败'),
      error,
      400,
    );
  }
};

export const GET = withApiHandler(getThirdPartyServicesHandler);
export const POST = withApiHandler(createThirdPartyServiceHandler);
export const PUT = withApiHandler(updateThirdPartyServicesHandler);
