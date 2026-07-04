import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import tinify from 'tinify';
import {
  COMMON_ERROR,
  FILE_ERROR,
  createErrorResponse,
  withAuthenticatedApiHandler,
} from '@/lib/server';
import type { ApiContext, ApiHandler } from '@/lib/server/types';
import { createRequestId, getRequestIp } from '@/lib/ai/security/request-security';
import { getUserThirdPartyServiceApiKey } from '@/lib/third-party-service-credentials/service';

export const runtime = 'nodejs';
const TINYPNG_SERVICE_NAME = 'tinypng';

const TINIFY_SUPPORTED_MIME_TYPES = new Set([
  'image/avif',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function getTinifyErrorStatus(error: unknown): number {
  if (error instanceof tinify.AccountError) return 429;
  if (error instanceof tinify.ClientError) return 400;
  if (error instanceof tinify.ServerError) return 503;
  if (error instanceof tinify.ConnectionError) return 502;

  const status = (error as { status?: unknown })?.status;
  if (typeof status === 'number' && status >= 400 && status <= 599) {
    return status;
  }

  return 500;
}

async function compressWithTinify(
  input: Buffer,
  mime: string,
  apiKey: string,
): Promise<{ data: Buffer; mime: string }> {
  tinify.key = apiKey;
  const result = await tinify.fromBuffer(input as unknown as Uint8Array).toBuffer();
  const buffer = Buffer.isBuffer(result) ? result : Buffer.from(result);

  return { data: buffer, mime };
}

/**
 * @openapi
 * /api/compress/tinify:
 *   post:
 *     tags:
 *       - Compress
 *     summary: Compress an image with TinyPNG
 *     description: Returns a compressed binary image. Error path returns standard JSON error.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Compressed image binary
 *         content:
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: 未提供文件、文件类型不受支持或 TinyPNG 拒绝处理该图片
 *       429:
 *         description: TinyPNG 账户配额或 API 密钥存在问题
 *       502:
 *         description: 连接 TinyPNG 失败
 *       503:
 *         description: TinyPNG 服务错误
 *       500:
 *         description: 压缩失败
 */
const tinifyHandler: ApiHandler = async (request: NextRequest, context: ApiContext) => {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return createErrorResponse(COMMON_ERROR.PARAM_ERROR, '未提供文件', null, 400);
  }

  if (!TINIFY_SUPPORTED_MIME_TYPES.has(file.type)) {
    return createErrorResponse(
      FILE_ERROR.TYPE_NOT_SUPPORTED,
      `TinyPNG 不支持该文件类型：${file.type || '未知'}`,
      null,
      400,
    );
  }

  try {
    const apiKey = await getUserThirdPartyServiceApiKey(
      context.user?.userId ?? '',
      TINYPNG_SERVICE_NAME,
      {
        ip: getRequestIp(request),
        requestId: createRequestId(),
      },
    );
    const source = Buffer.from(await file.arrayBuffer());
    const { data, mime } = await compressWithTinify(source, file.type, apiKey);

    return new NextResponse(new Blob([new Uint8Array(data)], { type: mime }), {
      status: 200,
      headers: { 'Content-Type': mime },
    });
  } catch (error) {
    return createErrorResponse(
      FILE_ERROR.COMPRESS_FAILED,
      error instanceof Error ? error.message : '压缩失败',
      error,
      getTinifyErrorStatus(error),
    );
  }
};

export const POST = withAuthenticatedApiHandler(tinifyHandler);
