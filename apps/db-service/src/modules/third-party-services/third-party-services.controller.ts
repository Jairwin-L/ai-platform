import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DATA_ERROR } from '@ai/constants/error-codes';
import { PERMISSION_CODE } from '@ai/constants/permissions';
import { AdminAnyPermissionAuth, AdminPermissionAuth } from '@/common/decorators/auth.decorator';
import { ApiException } from '@/common/http/api-exception';
import { success } from '@/common/http/api-result';
import {
  createStoredThirdPartyServiceOption,
  deleteStoredThirdPartyServiceOption,
  getServiceOptionsStorageErrorMessage,
  getStoredThirdPartyServiceOption,
  getStoredThirdPartyServiceOptions,
  updateStoredThirdPartyServiceOption,
  updateStoredThirdPartyServiceOptions,
} from '@/lib/third-party-service-options/store';
import {
  serviceValueParam,
  thirdPartyServiceOptionSchema,
  thirdPartyServiceOptionsSchema,
  type ThirdPartyServiceOptionInput,
  type ThirdPartyServiceOptionsInput,
} from './schemas';

function isStoreError(error: unknown, code: string): boolean {
  return error instanceof Error && error.message === code;
}

const { THIRD_PARTY_SERVICE } = PERMISSION_CODE.OPERATION;

/**
 * 管理后台：维护用户第三方服务凭据页可选择的服务。迁移前同样没有鉴权，现在按 THIRD_PARTY_SERVICE_* 权限码鉴权。
 */
@ApiTags('Third-party Services')
@Controller('third-party-services')
export class ThirdPartyServicesController {
  @Get()
  @AdminAnyPermissionAuth(THIRD_PARTY_SERVICE.READ, THIRD_PARTY_SERVICE.WRITE)
  @ApiOperation({ summary: 'List third-party service options' })
  async list() {
    try {
      return success(await getStoredThirdPartyServiceOptions(), '第三方服务配置查询成功');
    } catch (error) {
      throw new ApiException(
        DATA_ERROR.QUERY_FAILED,
        getServiceOptionsStorageErrorMessage(error, '第三方服务配置查询失败'),
        error,
        500,
      );
    }
  }

  @Post()
  @AdminPermissionAuth(THIRD_PARTY_SERVICE.WRITE)
  @ApiOperation({ summary: 'Create a third-party service option' })
  async create(
    @Body({ schema: thirdPartyServiceOptionSchema }) body: ThirdPartyServiceOptionInput,
  ) {
    try {
      await createStoredThirdPartyServiceOption(body);
      return success(await getStoredThirdPartyServiceOption(body.value), '第三方服务创建成功');
    } catch (error) {
      if (isStoreError(error, 'THIRD_PARTY_SERVICE_DUPLICATE')) {
        throw new ApiException(DATA_ERROR.DUPLICATE_ENTRY, '第三方服务标识必须唯一', null, 409);
      }
      throw new ApiException(
        DATA_ERROR.UPDATE_FAILED,
        getServiceOptionsStorageErrorMessage(error, '第三方服务创建失败'),
        error,
        400,
      );
    }
  }

  @Put()
  @AdminPermissionAuth(THIRD_PARTY_SERVICE.WRITE)
  @ApiOperation({ summary: 'Replace all third-party service options' })
  async replaceAll(
    @Body({ schema: thirdPartyServiceOptionsSchema }) body: ThirdPartyServiceOptionsInput,
  ) {
    try {
      await updateStoredThirdPartyServiceOptions(body.options);
      return success(await getStoredThirdPartyServiceOptions(), '第三方服务配置更新成功');
    } catch (error) {
      throw new ApiException(
        DATA_ERROR.UPDATE_FAILED,
        getServiceOptionsStorageErrorMessage(error, '第三方服务配置更新失败'),
        error,
        400,
      );
    }
  }

  @Get(':service')
  @AdminAnyPermissionAuth(THIRD_PARTY_SERVICE.READ, THIRD_PARTY_SERVICE.WRITE)
  @ApiOperation({ summary: 'Get a third-party service option' })
  async findOne(@Param('service', { schema: serviceValueParam }) service: string) {
    let option: Awaited<ReturnType<typeof getStoredThirdPartyServiceOption>>;
    try {
      option = await getStoredThirdPartyServiceOption(service);
    } catch (error) {
      throw new ApiException(
        DATA_ERROR.QUERY_FAILED,
        getServiceOptionsStorageErrorMessage(error, '第三方服务详情查询失败'),
        error,
        500,
      );
    }
    if (!option) {
      throw new ApiException(DATA_ERROR.NOT_FOUND, '第三方服务不存在', null, 404);
    }
    return success(option, '第三方服务详情查询成功');
  }

  @Put(':service')
  @AdminPermissionAuth(THIRD_PARTY_SERVICE.WRITE)
  @ApiOperation({ summary: 'Update a third-party service option' })
  async update(
    @Param('service', { schema: serviceValueParam }) service: string,
    @Body({ schema: thirdPartyServiceOptionSchema }) body: ThirdPartyServiceOptionInput,
  ) {
    try {
      await updateStoredThirdPartyServiceOption(service, body);
      return success(await getStoredThirdPartyServiceOption(body.value), '第三方服务更新成功');
    } catch (error) {
      if (isStoreError(error, 'THIRD_PARTY_SERVICE_NOT_FOUND')) {
        throw new ApiException(DATA_ERROR.NOT_FOUND, '第三方服务不存在', null, 404);
      }
      if (isStoreError(error, 'THIRD_PARTY_SERVICE_DUPLICATE')) {
        throw new ApiException(DATA_ERROR.DUPLICATE_ENTRY, '第三方服务标识必须唯一', null, 409);
      }
      throw new ApiException(
        DATA_ERROR.UPDATE_FAILED,
        getServiceOptionsStorageErrorMessage(error, '第三方服务更新失败'),
        error,
        400,
      );
    }
  }

  @Delete(':service')
  @AdminPermissionAuth(THIRD_PARTY_SERVICE.WRITE)
  @ApiOperation({ summary: 'Delete a third-party service option' })
  async remove(@Param('service', { schema: serviceValueParam }) service: string) {
    try {
      await deleteStoredThirdPartyServiceOption(service);
      return success({ value: service }, '第三方服务删除成功');
    } catch (error) {
      if (isStoreError(error, 'THIRD_PARTY_SERVICE_NOT_FOUND')) {
        throw new ApiException(DATA_ERROR.NOT_FOUND, '第三方服务不存在', null, 404);
      }
      throw new ApiException(
        DATA_ERROR.DELETE_FAILED,
        getServiceOptionsStorageErrorMessage(error, '第三方服务删除失败'),
        error,
        400,
      );
    }
  }
}
