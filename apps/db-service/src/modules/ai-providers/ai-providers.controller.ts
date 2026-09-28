import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DATA_ERROR } from '@ai/constants/error-codes';
import { AdminAuth } from '@/common/decorators/auth.decorator';
import { ApiException } from '@/common/http/api-exception';
import { success } from '@/common/http/api-result';
import {
  createStoredAiProviderOption,
  deleteStoredAiProviderOption,
  getProviderOptionsStorageErrorMessage,
  getStoredAiProviderOption,
  getStoredAiProviderOptions,
  updateStoredAiProviderOption,
  updateStoredAiProviderOptions,
} from '@/lib/ai/byok/provider-options-store';
import {
  aiProviderOptionSchema,
  aiProviderOptionsSchema,
  providerValueParam,
  type AiProviderOptionInput,
  type AiProviderOptionsInput,
} from './schemas';

function isStoreError(error: unknown, code: string): boolean {
  return error instanceof Error && error.message === code;
}

/**
 * 管理后台：维护用户 AI 密钥页可选择的 Provider。
 *
 * 迁移前这组接口挂在 /api/admin/ai-providers 下却没有任何鉴权，任何人都能改调用地址；
 * 现在统一要求 admin 会话。
 */
@ApiTags('AI Providers')
@Controller('ai-providers')
@AdminAuth()
export class AiProvidersController {
  @Get()
  @ApiOperation({ summary: 'List AI provider options' })
  async list() {
    try {
      return success(await getStoredAiProviderOptions(), 'AI Provider 配置查询成功');
    } catch (error) {
      throw new ApiException(
        DATA_ERROR.QUERY_FAILED,
        getProviderOptionsStorageErrorMessage(error, 'AI Provider 配置查询失败'),
        error,
        500,
      );
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create an AI provider option' })
  async create(@Body({ schema: aiProviderOptionSchema }) body: AiProviderOptionInput) {
    try {
      await createStoredAiProviderOption(body);
      return success(await getStoredAiProviderOption(body.value), 'AI Provider 创建成功');
    } catch (error) {
      if (isStoreError(error, 'AI_PROVIDER_DUPLICATE')) {
        throw new ApiException(DATA_ERROR.DUPLICATE_ENTRY, 'AI Provider 标识必须唯一', null, 409);
      }
      throw new ApiException(
        DATA_ERROR.UPDATE_FAILED,
        getProviderOptionsStorageErrorMessage(error, 'AI Provider 创建失败'),
        error,
        400,
      );
    }
  }

  @Put()
  @ApiOperation({ summary: 'Replace all AI provider options (order follows the payload)' })
  async replaceAll(@Body({ schema: aiProviderOptionsSchema }) body: AiProviderOptionsInput) {
    try {
      await updateStoredAiProviderOptions(body.options);
      return success(await getStoredAiProviderOptions(), 'AI Provider 配置更新成功');
    } catch (error) {
      throw new ApiException(
        DATA_ERROR.UPDATE_FAILED,
        getProviderOptionsStorageErrorMessage(error, 'AI Provider 配置更新失败'),
        error,
        400,
      );
    }
  }

  @Get(':provider')
  @ApiOperation({ summary: 'Get an AI provider option' })
  async findOne(@Param('provider', { schema: providerValueParam }) provider: string) {
    let option: Awaited<ReturnType<typeof getStoredAiProviderOption>>;
    try {
      option = await getStoredAiProviderOption(provider);
    } catch (error) {
      throw new ApiException(
        DATA_ERROR.QUERY_FAILED,
        getProviderOptionsStorageErrorMessage(error, 'AI Provider 详情查询失败'),
        error,
        500,
      );
    }
    if (!option) {
      throw new ApiException(DATA_ERROR.NOT_FOUND, 'AI Provider 不存在', null, 404);
    }
    return success(option, 'AI Provider 详情查询成功');
  }

  @Put(':provider')
  @ApiOperation({ summary: 'Update an AI provider option' })
  async update(
    @Param('provider', { schema: providerValueParam }) provider: string,
    @Body({ schema: aiProviderOptionSchema }) body: AiProviderOptionInput,
  ) {
    try {
      await updateStoredAiProviderOption(provider, body);
      return success(await getStoredAiProviderOption(body.value), 'AI Provider 更新成功');
    } catch (error) {
      if (isStoreError(error, 'AI_PROVIDER_NOT_FOUND')) {
        throw new ApiException(DATA_ERROR.NOT_FOUND, 'AI Provider 不存在', null, 404);
      }
      if (isStoreError(error, 'AI_PROVIDER_DUPLICATE')) {
        throw new ApiException(DATA_ERROR.DUPLICATE_ENTRY, 'AI Provider 标识必须唯一', null, 409);
      }
      throw new ApiException(
        DATA_ERROR.UPDATE_FAILED,
        getProviderOptionsStorageErrorMessage(error, 'AI Provider 更新失败'),
        error,
        400,
      );
    }
  }

  @Delete(':provider')
  @ApiOperation({ summary: 'Delete an AI provider option' })
  async remove(@Param('provider', { schema: providerValueParam }) provider: string) {
    try {
      await deleteStoredAiProviderOption(provider);
      return success({ value: provider }, 'AI Provider 删除成功');
    } catch (error) {
      if (isStoreError(error, 'AI_PROVIDER_NOT_FOUND')) {
        throw new ApiException(DATA_ERROR.NOT_FOUND, 'AI Provider 不存在', null, 404);
      }
      throw new ApiException(
        DATA_ERROR.DELETE_FAILED,
        getProviderOptionsStorageErrorMessage(error, 'AI Provider 删除失败'),
        error,
        400,
      );
    }
  }
}
