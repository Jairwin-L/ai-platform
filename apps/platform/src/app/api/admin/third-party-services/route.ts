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
  getServiceOptionsStorageErrorMessage,
  getStoredThirdPartyServiceOptions,
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

  try {
    payload = (await request.json()) as ISettingsApi.ThirdPartyServicePayload;
  } catch (error) {
    return createErrorResponse(DATA_ERROR.VALIDATION_FAILED, '请求 JSON 格式无效', error, 400);
  }

  try {
    const serviceOptions = normalizeThirdPartyServiceOptions(payload.options);

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

export const GET = withApiHandler(getThirdPartyServicesHandler);
export const PUT = withApiHandler(updateThirdPartyServicesHandler);
