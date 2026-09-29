import { Body, Controller, Delete, Get, Param, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ByokAuth } from '@/common/decorators/byok.decorator';
import { CurrentUser } from '@/common/decorators/auth.decorator';
import { success } from '@/common/http/api-result';
import type { AuthenticatedRequest } from '@/common/types/request';
import { BYOK_ERROR_CODE } from '@/lib/ai/byok/constants';
import { ByokPublicError } from '@/lib/ai/byok/errors';
import { getEnabledAiProviderOptions } from '@/lib/ai/byok/provider-options';
import { getStoredAiProviderOptions } from '@/lib/ai/byok/provider-options-store';
import { credentialIdSchema, saveOrOverwriteApiCredentialSchema } from '@/lib/ai/byok/schemas';
import {
  deleteUserApiCredential,
  listUserApiCredentials,
  overwriteUserApiCredential,
  saveUserApiCredential,
} from '@/lib/ai/byok/service';
import { assertRateLimit } from '@/lib/ai/security/rate-limit';
import {
  createRequestId,
  getRequestIp,
  parseLimitedJsonBody,
} from '@/lib/ai/security/request-security';

/**
 * 用户自带的 AI Provider API Key（BYOK）。
 *
 * 明文 Key 只在保存时经过一次内存，AES-256-GCM 加密后写入 Redis（带 TTL），接口只返回掩码提示；
 * 响应一律 no-store（NoStoreMiddleware），错误响应带 BYOK 业务码（ByokExceptionFilter）。
 */
@ApiTags('BYOK Credentials')
@Controller('platform/user/ai-credentials')
export class ByokCredentialsController {
  @Get()
  @ByokAuth()
  @ApiOperation({ summary: 'List saved AI credentials (masked)' })
  async list(@CurrentUser() user: AuthUser) {
    const result = await listUserApiCredentials(user.userId);
    return success(result.credentials);
  }

  @Post()
  @ByokAuth({ requireJson: true, requireOrigin: true })
  @ApiOperation({ summary: 'Save or overwrite an AI credential' })
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
      route: 'POST /api/user/ai-credentials',
      limit: 10,
      windowSeconds: 60 * 60,
      requestId,
    });

    const input = parseLimitedJsonBody(body, saveOrOverwriteApiCredentialSchema);

    if ('credentialId' in input) {
      const { credentialId, ...payload } = input;
      return success(
        await overwriteUserApiCredential(user.userId, credentialId, payload, { requestId, ip }),
      );
    }

    const providerOptions = getEnabledAiProviderOptions(await getStoredAiProviderOptions());
    if (!providerOptions.some((option) => option.value === input.provider)) {
      throw new ByokPublicError(BYOK_ERROR_CODE.UNSUPPORTED_PROVIDER, 400);
    }

    return success(await saveUserApiCredential(user.userId, input, { requestId, ip }));
  }

  @Delete(':credentialId')
  @ByokAuth({ requireOrigin: true })
  @ApiOperation({ summary: 'Delete an AI credential' })
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
      route: 'DELETE /api/user/ai-credentials/[credentialId]',
      limit: 20,
      windowSeconds: 60 * 60,
      requestId,
    });

    return success(
      await deleteUserApiCredential(user.userId, parsedCredentialId.data, { requestId, ip }),
    );
  }
}
