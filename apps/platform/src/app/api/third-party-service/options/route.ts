import {
  DATA_ERROR,
  createErrorResponse,
  createSuccessResponse,
  withApiHandler,
  type ApiHandler,
} from '@/lib/server';
import { getEnabledThirdPartyServiceOptions } from '@/lib/third-party-service-options/options';
import {
  getServiceOptionsStorageErrorMessage,
  getStoredThirdPartyServiceOptions,
} from '@/lib/third-party-service-options/store';

const getThirdPartyServiceOptionsHandler: ApiHandler = async () => {
  try {
    const serviceOptions = getEnabledThirdPartyServiceOptions(
      await getStoredThirdPartyServiceOptions(),
    );

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

export const GET = withApiHandler(getThirdPartyServiceOptionsHandler);
