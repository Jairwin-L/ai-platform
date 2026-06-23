import type { NextRequest } from 'next/server';
import { AwsClient } from 'aws4fetch';
import {
  COMMON_ERROR,
  FILE_ERROR,
  createErrorResponse,
  createSuccessResponse,
  withApiHandler,
} from '@/lib/server';

export const runtime = 'nodejs';

const DEFAULT_EXPIRES_IN = 60 * 60;
const MAX_EXPIRES_IN = 60 * 60 * 24 * 7;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_FILE_COUNT = 5;
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
]);

interface PresignedRequestFile {
  fileName?: string;
  fileType?: string;
}

interface PresignedRequestBody {
  files?: PresignedRequestFile[];
  path?: string;
  expiresIn?: number;
}

interface PresignedUrlItem {
  url: string;
  key: string;
  fileName: string;
  expiresAt: string;
  maxFileSize: number;
}

interface StorageConfig {
  endpointUrl: string;
  bucketName: string;
}

function getEnv(name: string): string | undefined {
  return process.env[name];
}

function getStorageConfig(): StorageConfig {
  const missing = [
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_ENDPOINT_URL',
    'R2_BUCKET_NAME',
  ].filter((name) => !getEnv(name));

  if (missing.length > 0) {
    throw new Error(`缺少必要的环境变量：${missing.join(', ')}`);
  }

  return {
    endpointUrl: getEnv('R2_ENDPOINT_URL') as string,
    bucketName: getEnv('R2_BUCKET_NAME') as string,
  };
}

function getSafePath(path?: string): string {
  if (!path) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `upload/${year}/${month}/${day}`;
  }

  const safePath = path
    .replace(/\.\./g, '')
    .replace(/[^\w/-]/g, '')
    .replace(/^\/+|\/+$/g, '');

  return safePath || 'upload';
}

function getFileExtension(fileName?: string, fileType?: string): string {
  const byType: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/avif': 'avif',
  };

  if (fileType && byType[fileType]) {
    return byType[fileType];
  }

  const match = fileName?.match(/\.([^.]+)$/);
  return match?.[1]?.toLowerCase() || 'bin';
}

function getSafeFileName(fileName?: string, fileType?: string): string {
  const extension = getFileExtension(fileName, fileType);
  const baseName = (fileName || crypto.randomUUID())
    .replace(/\.[^/.]+$/, '')
    .trim()
    .replace(/[^\w-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
  const safeBaseName = baseName || crypto.randomUUID();

  return `${safeBaseName}-${Date.now().toString(36)}.${extension}`;
}

function createAwsClient(): AwsClient {
  return new AwsClient({
    accessKeyId: getEnv('R2_ACCESS_KEY_ID') as string,
    secretAccessKey: getEnv('R2_SECRET_ACCESS_KEY') as string,
  });
}

async function createPresignedUrl(
  client: AwsClient,
  endpointUrl: string,
  bucketName: string,
  file: PresignedRequestFile,
  path: string,
  expiresIn: number,
): Promise<PresignedUrlItem> {
  const fileType = file.fileType?.toLowerCase();

  if (fileType && !ALLOWED_MIME_TYPES.has(fileType)) {
    throw new Error(`不支持的文件类型：${file.fileType}`);
  }

  const fileName = getSafeFileName(file.fileName, fileType);
  const key = `${path}/${fileName}`;
  const url = new URL(endpointUrl);

  if (url.pathname.includes(bucketName)) {
    url.pathname = `/${key}`;
  } else {
    url.pathname = `/${bucketName}/${key}`;
  }
  url.searchParams.set('X-Amz-Expires', String(expiresIn));

  const headers = new Headers();
  if (fileType) {
    headers.set('Content-Type', fileType);
  }

  const request = new Request(url, {
    method: 'PUT',
    headers,
  });
  const signed = await client.sign(request, {
    aws: {
      signQuery: true,
      service: 's3',
      region: 'auto',
    },
  });

  return {
    url: signed.url,
    key,
    fileName,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    maxFileSize: MAX_FILE_SIZE,
  };
}

function getRejectedReason(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}

/**
 * @openapi
 * /api/upload/presigned:
 *   post:
 *     tags:
 *       - Upload
 *     summary: Generate presigned upload URLs for Cloudflare R2
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [files]
 *             properties:
 *               files:
 *                 type: array
 *                 maxItems: 5
 *                 items:
 *                   type: object
 *                   properties:
 *                     fileName:
 *                       type: string
 *                     fileType:
 *                       type: string
 *               path:
 *                 type: string
 *               expiresIn:
 *                 type: integer
 *                 default: 3600
 *                 maximum: 604800
 *     responses:
 *       200:
 *         description: 预签名上传地址生成成功
 *       400:
 *         description: 参数错误或文件类型不受支持
 *       500:
 *         description: 预签名上传地址生成失败
 */
const createPresignedUrlsHandler = async (request: NextRequest) => {
  let storageConfig: StorageConfig;

  try {
    storageConfig = getStorageConfig();
  } catch (error) {
    return createErrorResponse(
      FILE_ERROR.STORAGE_ERROR,
      error instanceof Error ? error.message : '存储服务配置错误',
      error,
      500,
    );
  }

  const body = (await request.json()) as PresignedRequestBody;
  const files = body.files || [];

  if (!Array.isArray(files) || files.length === 0) {
    return createErrorResponse(COMMON_ERROR.PARAM_ERROR, 'files 不能为空', null, 400);
  }

  if (files.length > MAX_FILE_COUNT) {
    return createErrorResponse(
      COMMON_ERROR.PARAM_ERROR,
      `每次请求最多允许 ${MAX_FILE_COUNT} 个文件`,
      null,
      400,
    );
  }

  for (const file of files) {
    const fileType = file.fileType?.toLowerCase();

    if (fileType && !ALLOWED_MIME_TYPES.has(fileType)) {
      return createErrorResponse(
        FILE_ERROR.TYPE_NOT_SUPPORTED,
        `不支持的文件类型：${file.fileType}`,
        null,
        400,
      );
    }
  }

  const expiresIn = Math.min(Math.max(body.expiresIn || DEFAULT_EXPIRES_IN, 1), MAX_EXPIRES_IN);
  const path = getSafePath(body.path);
  const client = createAwsClient();

  try {
    const results = await Promise.allSettled(
      files.map((file) =>
        createPresignedUrl(
          client,
          storageConfig.endpointUrl,
          storageConfig.bucketName,
          file,
          path,
          expiresIn,
        ),
      ),
    );
    const rejectedReasons = results.flatMap((result) =>
      result.status === 'rejected' ? [getRejectedReason(result.reason)] : [],
    );

    if (rejectedReasons.length > 0) {
      throw new Error(rejectedReasons.join('；') || '生成预签名上传地址失败');
    }

    const data = results.map((result) => {
      if (result.status === 'fulfilled') return result.value;
      throw new Error('生成预签名上传地址失败');
    });

    return createSuccessResponse(data, '预签名上传地址生成成功');
  } catch (error) {
    return createErrorResponse(
      FILE_ERROR.UPLOAD_FAILED,
      error instanceof Error ? error.message : '生成预签名上传地址失败',
      error,
      500,
    );
  }
};

export const POST = withApiHandler(createPresignedUrlsHandler);
