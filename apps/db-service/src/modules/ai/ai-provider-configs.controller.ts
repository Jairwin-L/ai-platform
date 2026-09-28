import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { z } from 'zod';
import { DATA_ERROR } from '@ai/constants/error-codes';
import { AiAuth } from '@/common/decorators/byok.decorator';
import { Auth, CurrentUser } from '@/common/decorators/auth.decorator';
import { ApiException } from '@/common/http/api-exception';
import { success } from '@/common/http/api-result';
import { getPublicAiProviderOptions } from '@/lib/ai/byok/provider-options';
import {
  getProviderOptionsStorageErrorMessage,
  getStoredAiProviderOptions,
} from '@/lib/ai/byok/provider-options-store';
import { idSchema, providerConfigCreateSchema, providerConfigUpdateSchema } from '@/lib/ai/schemas';
import {
  createProviderConfig,
  deleteProviderConfig,
  listProviderConfigs,
  updateProviderConfig,
  verifyProviderConfig,
} from '@/lib/ai/service';

type ProviderConfigCreateInput = z.infer<typeof providerConfigCreateSchema>;
type ProviderConfigUpdateInput = z.infer<typeof providerConfigUpdateSchema>;

@ApiTags('AI Settings')
@Controller('platform/ai/provider-configs')
export class AiProviderConfigsController {
  @Get()
  @AiAuth()
  @ApiOperation({ summary: 'List provider configs (API key only shown as last 4 characters)' })
  async list(@CurrentUser() user: AuthUser) {
    return success(await listProviderConfigs(user.userId));
  }

  @Post()
  @AiAuth()
  @ApiOperation({ summary: 'Create a provider config' })
  async create(
    @CurrentUser() user: AuthUser,
    @Body({ schema: providerConfigCreateSchema }) body: ProviderConfigCreateInput,
  ) {
    return success(await createProviderConfig(user.userId, body), 'Provider 创建成功');
  }

  @Patch(':id')
  @AiAuth()
  @ApiOperation({ summary: 'Update a provider config' })
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: providerConfigUpdateSchema }) body: ProviderConfigUpdateInput,
  ) {
    return success(await updateProviderConfig(user.userId, id, body), 'Provider 更新成功');
  }

  @Delete(':id')
  @AiAuth()
  @ApiOperation({ summary: 'Delete a provider config' })
  async remove(@CurrentUser() user: AuthUser, @Param('id', { schema: idSchema }) id: string) {
    await deleteProviderConfig(user.userId, id);
    return success({ deleted: true }, 'Provider 删除成功');
  }

  @Post(':id/verify')
  @HttpCode(200)
  @AiAuth()
  @ApiOperation({ summary: 'Verify a provider config by listing models upstream' })
  async verify(@CurrentUser() user: AuthUser, @Param('id', { schema: idSchema }) id: string) {
    return success(await verifyProviderConfig(user.userId, id), 'Provider 验证完成');
  }
}

/** 用户新增密钥时可选择的 Provider：不返回调用地址与协议 */
@ApiTags('AI Settings')
@Controller('platform/ai/provider-options')
export class AiProviderOptionsController {
  @Get()
  @Auth()
  @ApiOperation({ summary: 'List enabled AI providers for BYOK' })
  async list() {
    try {
      return success(
        getPublicAiProviderOptions(await getStoredAiProviderOptions()),
        'AI Provider 配置查询成功',
      );
    } catch (error) {
      throw new ApiException(
        DATA_ERROR.QUERY_FAILED,
        getProviderOptionsStorageErrorMessage(error, 'AI Provider 配置查询失败'),
        error,
        500,
      );
    }
  }
}
