import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { AwsClient } from 'aws4fetch';
import { FILE_ERROR } from '@ai/constants/error-codes';
import { ApiException } from '@/common/http/api-exception';
import { logger } from '@/infra/logger/logger';
import type { PresignedRequestInput } from './schemas';

const DEFAULT_EXPIRES_IN = 60 * 60;
const MAX_EXPIRES_IN = 60 * 60 * 24 * 7;
const MAX_FILE_SIZE = 20 * 1024 * 1024;

/** 允许签发的类型与对应扩展名：扩展名只从这里取，不信任客户端文件名里的后缀 */
const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

interface StorageConfig {
  accessKeyId: string;
  secretAccessKey: string;
  endpointUrl: string;
  bucketName: string;
}

/** 存储凭据只从环境变量读取，缺失时报出变量名，不回传任何值 */
function getStorageConfig(): StorageConfig {
  const names = ['R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_ENDPOINT_URL', 'R2_BUCKET_NAME'];
  const missing = names.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(`缺少必要的环境变量：${missing.join(', ')}`);
  }

  return {
    accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
    endpointUrl: process.env.R2_ENDPOINT_URL as string,
    bucketName: process.env.R2_BUCKET_NAME as string,
  };
}

function getSafePath(path?: string): string {
  if (!path) {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `upload/${now.getFullYear()}/${month}/${day}`;
  }

  const safePath = path
    .replace(/\.\./g, '')
    .replace(/[^\w/-]/g, '')
    .replace(/^\/+|\/+$/g, '');

  return safePath || 'upload';
}

/**
 * 归一化并校验文件类型，不在白名单内返回 null。
 *
 * fileType 必须显式给出且在白名单内：迁移前空类型会跳过校验、扩展名改取文件名后缀，
 * 任何有上传权限的用户都能往公开存储桶传 `.html` / `.svg`，等于在存储域名下托管可执行页面。
 */
function normalizeMimeType(fileType?: string): string | null {
  const mimeType = fileType?.trim().toLowerCase();
  return mimeType && Object.hasOwn(EXTENSION_BY_MIME_TYPE, mimeType) ? mimeType : null;
}

function getSafeFileName(fileName: string | undefined, mimeType: string): string {
  const extension = EXTENSION_BY_MIME_TYPE[mimeType];
  const baseName = (fileName || randomUUID())
    .replace(/\.[^/.]+$/, '')
    .trim()
    .replace(/[^\w-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
  return `${baseName || randomUUID()}-${Date.now().toString(36)}.${extension}`;
}

@Injectable()
export class UploadService {
  async createPresignedUrls(body: PresignedRequestInput): Promise<IUploadApi.PresignedUrlItem[]> {
    let config: StorageConfig;
    try {
      config = getStorageConfig();
    } catch (error) {
      logger.error({ error }, '[upload] 存储配置读取失败');
      throw new ApiException(FILE_ERROR.STORAGE_ERROR, '存储服务配置缺失', error, 500);
    }

    const mimeTypes = body.files.map((file) => normalizeMimeType(file.fileType));
    const unsupportedIndex = mimeTypes.findIndex((mimeType) => mimeType === null);
    if (unsupportedIndex >= 0) {
      throw new ApiException(
        FILE_ERROR.TYPE_NOT_SUPPORTED,
        `不支持的文件类型：${body.files[unsupportedIndex].fileType || '未知'}`,
        null,
        400,
      );
    }

    const expiresIn = Math.min(Math.max(body.expiresIn || DEFAULT_EXPIRES_IN, 1), MAX_EXPIRES_IN);
    const path = getSafePath(body.path);
    const client = new AwsClient({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    });

    const results = await Promise.allSettled(
      body.files.map(async (file, index) => {
        const mimeType = mimeTypes[index] as string;
        const fileName = getSafeFileName(file.fileName, mimeType);
        const key = `${path}/${fileName}`;
        const url = new URL(config.endpointUrl);

        url.pathname = url.pathname.includes(config.bucketName)
          ? `/${key}`
          : `/${config.bucketName}/${key}`;
        url.searchParams.set('X-Amz-Expires', String(expiresIn));

        // Content-Type 纳入签名：上传时换成 text/html 等其他类型会签名不匹配、被存储端拒绝
        const signed = await client.sign(
          new Request(url, { method: 'PUT', headers: { 'Content-Type': mimeType } }),
          { aws: { signQuery: true, service: 's3', region: 'auto' } },
        );

        return {
          url: signed.url,
          key,
          fileName,
          expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
          maxFileSize: MAX_FILE_SIZE,
        };
      }),
    );

    const rejected = results.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    if (rejected.length > 0) {
      logger.error({ errors: rejected.map((result) => result.reason) }, '[upload] 预签名失败');
      throw new ApiException(FILE_ERROR.UPLOAD_FAILED, '生成预签名上传地址失败', null, 500);
    }

    return results.map(
      (result) => (result as PromiseFulfilledResult<IUploadApi.PresignedUrlItem>).value,
    );
  }
}
