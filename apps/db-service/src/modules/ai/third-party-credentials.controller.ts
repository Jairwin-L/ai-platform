import { Body, Controller, Delete, Get, Param, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DATA_ERROR } from '@ai/constants/error-codes';
import { ByokAuth } from '@/common/decorators/byok.decorator';
import { CurrentUser } from '@/common/decorators/auth.decorator';
import { ApiException } from '@/common/http/api-exception';
import { success } from '@/common/http/api-result';
import type { AuthenticatedRequest } from '@/common/types/request';
import { BYOK_ERROR_CODE } from '@/lib/ai/byok/constants';
import { ByokPublicError } from '@/lib/ai/byok/errors';
import { assertRateLimit } from '@/lib/ai/security/rate-limit';
import {
  createRequestId,
  getRequestIp,
  parseLimitedJsonBody,
} from '@/lib/ai/security/request-security';
import {
  credentialIdSchema,
  saveOrOverwriteCredentialSchema,
} from '@/lib/third-party-service-credentials/schemas';
import {
  deleteUserThirdPartyServiceCredential,
  listUserThirdPartyServiceCredentials,
  overwriteUserThirdPartyServiceCredential,
  saveUserThirdPartyServiceCredential,
} from '@/lib/third-party-service-credentials/service';
import { getEnabledThirdPartyServiceOptions } from '@/lib/third-party-service-options/options';
import {
  getServiceOptionsStorageErrorMessage,
  getStoredThirdPartyServiceOptions,
} from '@/lib/third-party-service-options/store';

/**
 * 用户保存的第三方服务 API 凭据（如 TinyPNG），与 BYOK 共用加密与安全链路。
 */
@ApiTags('Third-party Credentials')
@Controller('platform/user/third-party-service')
export class ThirdPartyCredentialsController {
  @Get()
  @ByokAuth()
  @ApiOperation({ summary: 'List saved third-party service credentials (masked)' })
  async list(@CurrentUser() user: AuthUser) {
    const result = await listUserThirdPartyServiceCredentials(user.userId);
    return success(result.credentials);
  }

  @Post()
  @ByokAuth(undefined, { requireJson: true, requireOrigin: true })
  @ApiOperation({ summary: 'Save or overwrite a third-party service credential' })
  async save(
    @CurrentUser() user: AuthUser,
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    const requestId = createRequestId(request);
    const ip = getRequestIp(request);

    await assertRateLimit({
      userId: user.userId,
      ip,
      route: 'POST /api/user/third-party-service',
      limit: 10,
      windowSeconds: 60 * 60,
      requestId,
    });

    const input = parseLimitedJsonBody(body, saveOrOverwriteCredentialSchema);

    if ('credentialId' in input) {
      const { credentialId, ...payload } = input;
      return success(
        await overwriteUserThirdPartyServiceCredential(user.userId, credentialId, payload, {
          requestId,
          ip,
        }),
      );
    }

    const serviceOptions = getEnabledThirdPartyServiceOptions(
      await getStoredThirdPartyServiceOptions(),
    );
    if (!serviceOptions.some((option) => option.value === input.serviceName)) {
      throw new ByokPublicError(BYOK_ERROR_CODE.INVALID_REQUEST, 400, '暂不支持该第三方服务。');
    }

    return success(
      await saveUserThirdPartyServiceCredential(user.userId, input, { requestId, ip }),
    );
  }

  @Delete(':credentialId')
  @ByokAuth(undefined, { requireOrigin: true })
  @ApiOperation({ summary: 'Delete a third-party service credential' })
  async remove(
    @CurrentUser() user: AuthUser,
    @Req() request: AuthenticatedRequest,
    @Param('credentialId') credentialId: string,
  ) {
    const requestId = createRequestId(request);
    const ip = getRequestIp(request);
    const parsedCredentialId = credentialIdSchema.safeParse(credentialId);

    if (!parsedCredentialId.success) {
      throw new ByokPublicError(BYOK_ERROR_CODE.INVALID_REQUEST, 400);
    }

    await assertRateLimit({
      userId: user.userId,
      ip,
      route: 'DELETE /api/user/third-party-service/[credentialId]',
      limit: 20,
      windowSeconds: 60 * 60,
      requestId,
    });

    return success(
      await deleteUserThirdPartyServiceCredential(user.userId, parsedCredentialId.data, {
        requestId,
        ip,
      }),
    );
  }
}

/** 用户可选择的第三方服务：只返回已启用的服务名称与申请链接，公开读取与迁移前一致 */
@ApiTags('Third-party Credentials')
@Controller('platform/third-party-service')
export class ThirdPartyServiceOptionsController {
  @Get('options')
  @ApiOperation({ summary: 'List enabled third-party services' })
  async options() {
    try {
      return success(
        getEnabledThirdPartyServiceOptions(await getStoredThirdPartyServiceOptions()),
        '第三方服务配置查询成功',
      );
    } catch (error) {
      throw new ApiException(
        DATA_ERROR.QUERY_FAILED,
        getServiceOptionsStorageErrorMessage(error, '第三方服务配置查询失败'),
        error,
        500,
      );
    }
  }
}
