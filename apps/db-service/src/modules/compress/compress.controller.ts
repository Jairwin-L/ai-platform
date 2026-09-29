import {
  Controller,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
  applyDecorators,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { COMMON_ERROR, FILE_ERROR } from '@ai/constants/error-codes';
import { Auth, CurrentUser } from '@/common/decorators/auth.decorator';
import { ApiException } from '@/common/http/api-exception';
import type { AuthenticatedRequest } from '@/common/types/request';
import { compressWithSharp } from '@/infra/storage/image-compress';
import { logger } from '@/infra/logger/logger';
import { createRequestId, getRequestIp } from '@/lib/ai/security/request-security';
import { getUserThirdPartyServiceApiKey } from '@/lib/third-party-service-credentials/service';
import { TinifyRequestError, compressWithTinify } from './tinify-client';

const TINYPNG_SERVICE_NAME = 'tinypng';
/** 与预签名上传的单文件上限一致：能上传的图片都能先压缩 */
const MAX_COMPRESS_FILE_SIZE = 20 * 1024 * 1024;

const SHARP_SUPPORTED_MIME_TYPES = new Set([
  'image/avif',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const TINIFY_SUPPORTED_MIME_TYPES = new Set([
  'image/avif',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

/** multer 兜底上限：超过直接 413，不把整个文件读进内存 */
const MULTER_OPTIONS = { limits: { fileSize: MAX_COMPRESS_FILE_SIZE, files: 1 } };

function ApiCompressUpload() {
  return applyDecorators(
    ApiConsumes('multipart/form-data'),
    ApiBody({
      required: true,
      schema: {
        type: 'object',
        required: ['file'],
        properties: { file: { type: 'string', format: 'binary' } },
      },
    }),
  );
}

function assertFile(
  file: Express.Multer.File | undefined,
  supported: Set<string>,
  label: string,
): Express.Multer.File {
  if (!file) {
    throw new ApiException(COMMON_ERROR.PARAM_ERROR, '未提供文件', null, 400);
  }
  if (!supported.has(file.mimetype)) {
    throw new ApiException(
      FILE_ERROR.TYPE_NOT_SUPPORTED,
      `${label} 不支持该文件类型：${file.mimetype || '未知'}`,
      null,
      400,
    );
  }
  return file;
}

/** 取压缩失败的 HTTP 状态码：TinyPNG 响应码或业务错误自带的 status，其余视为 500 */
function getErrorStatus(error: unknown): number {
  if (error instanceof TinifyRequestError) return error.status;
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === 'number' ? status : 500;
}

function sendImage(response: Response, data: Buffer, mime: string): void {
  response.status(200).setHeader('Content-Type', mime);
  response.send(data);
}

@ApiTags('Compress')
// 通用接口：只挂根路径，platform 经 rewrites 把 /api/compress/* 转发到这里
@Controller('compress')
export class CompressController {
  @Post('sharp')
  @Auth()
  @UseInterceptors(FileInterceptor('file', MULTER_OPTIONS))
  @ApiOperation({ summary: 'Compress an image with sharp, returns the image binary' })
  @ApiCompressUpload()
  async sharp(
    @UploadedFile() uploaded: Express.Multer.File | undefined,
    @Res() response: Response,
  ): Promise<void> {
    const file = assertFile(uploaded, SHARP_SUPPORTED_MIME_TYPES, 'Sharp 压缩');

    try {
      const { data, mime } = await compressWithSharp(file.buffer, file.mimetype);
      sendImage(response, data, mime);
    } catch (error) {
      logger.error({ error }, '[compress] sharp 压缩失败');
      throw new ApiException(FILE_ERROR.COMPRESS_FAILED, '压缩失败', error, 500);
    }
  }

  @Post('tinify')
  @Auth()
  @UseInterceptors(FileInterceptor('file', MULTER_OPTIONS))
  @ApiOperation({ summary: "Compress an image with TinyPNG using the user's saved API key" })
  @ApiCompressUpload()
  async tinify(
    @UploadedFile() uploaded: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ): Promise<void> {
    const file = assertFile(uploaded, TINIFY_SUPPORTED_MIME_TYPES, 'TinyPNG');

    try {
      const apiKey = await getUserThirdPartyServiceApiKey(user.userId, TINYPNG_SERVICE_NAME, {
        ip: getRequestIp(request),
        requestId: createRequestId(request),
      });
      const data = await compressWithTinify(file.buffer, apiKey);
      sendImage(response, data, file.mimetype);
    } catch (error) {
      // 用户没保存 Key（404）、Key 无效或额度用尽（429）都要让前端知道原因，其余失败原因只记日志
      const status = getErrorStatus(error);
      if (status >= 500) logger.error({ error }, '[compress] TinyPNG 压缩失败');
      const message =
        error instanceof Error && status < 500 ? error.message : '压缩失败，请稍后重试';
      throw new ApiException(FILE_ERROR.COMPRESS_FAILED, message, error, status);
    }
  }
}
