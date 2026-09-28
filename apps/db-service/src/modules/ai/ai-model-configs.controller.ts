import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { z } from 'zod';
import { AiAuth, ByokAuth } from '@/common/decorators/byok.decorator';
import { CurrentUser } from '@/common/decorators/auth.decorator';
import { success } from '@/common/http/api-result';
import { BYOK_ERROR_CODE } from '@/lib/ai/byok/constants';
import { ByokPublicError } from '@/lib/ai/byok/errors';
import { saveStoredDefaultModelConfig } from '@/lib/ai/byok/key-store';
import { defaultModelConfigSchema } from '@/lib/ai/byok/schemas';
import { idSchema, modelConfigCreateSchema, modelConfigUpdateSchema } from '@/lib/ai/schemas';
import {
  createModelConfig,
  deleteModelConfig,
  listModelConfigs,
  updateModelConfig,
} from '@/lib/ai/service';
import { parseLimitedJsonBody } from '@/lib/ai/security/request-security';

type ModelConfigCreateInput = z.infer<typeof modelConfigCreateSchema>;
type ModelConfigUpdateInput = z.infer<typeof modelConfigUpdateSchema>;

@ApiTags('AI Settings')
@Controller('platform/ai/model-configs')
export class AiModelConfigsController {
  @Get()
  @AiAuth('AI:SETTINGS:VIEW')
  @ApiOperation({ summary: 'List available model configs derived from saved BYOK credentials' })
  async list(@CurrentUser() user: AuthUser) {
    return success(await listModelConfigs(user.userId));
  }

  @Post()
  @AiAuth('AI:SETTINGS:MANAGE')
  @ApiOperation({ summary: 'Create a model config' })
  async create(
    @CurrentUser() user: AuthUser,
    @Body({ schema: modelConfigCreateSchema }) body: ModelConfigCreateInput,
  ) {
    return success(await createModelConfig(user.userId, body), '模型配置创建成功');
  }

  /** 设置默认模型：走 BYOK 安全链路（写入 Redis 中的用户偏好） */
  @Post('default')
  @HttpCode(200)
  @ByokAuth('AI:SETTINGS:MANAGE', { requireJson: true, requireOrigin: true })
  @ApiOperation({ summary: 'Set the default model' })
  async setDefault(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const input = parseLimitedJsonBody(body, defaultModelConfigSchema);
    const modelConfigs = await listModelConfigs(user.userId);
    const selected = modelConfigs.find(
      (modelConfig) =>
        modelConfig.providerConfigId === input.credentialId &&
        modelConfig.modelId === input.modelId,
    );

    if (!selected) {
      throw new ByokPublicError(BYOK_ERROR_CODE.INVALID_REQUEST, 400, '模型不可用。');
    }

    return success(await saveStoredDefaultModelConfig(user.userId, input), '默认模型配置更新成功');
  }

  @Patch(':id')
  @AiAuth('AI:SETTINGS:MANAGE')
  @ApiOperation({ summary: 'Update a model config' })
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: modelConfigUpdateSchema }) body: ModelConfigUpdateInput,
  ) {
    return success(await updateModelConfig(user.userId, id, body), '模型配置更新成功');
  }

  @Delete(':id')
  @AiAuth('AI:SETTINGS:MANAGE')
  @ApiOperation({ summary: 'Delete a model config' })
  async remove(@CurrentUser() user: AuthUser, @Param('id', { schema: idSchema }) id: string) {
    await deleteModelConfig(user.userId, id);
    return success({ deleted: true }, '模型配置删除成功');
  }
}
