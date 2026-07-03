/**
 * @file
 * R2 浏览器直传工具函数。
 */

export type PresignedUrlItem = IUploadApi.PresignedUrlItem;
export type UploadProgressInfo = IUtils.UploadProgressInfo;

type PresignedResponse = IUploadApi.PresignedResponse;

/**
 * @func getFileMimeType
 * @desc 获取浏览器 File 的 MIME 类型，必要时根据扩展名兜底。
 * @param {File} file 待上传文件。
 * @returns {string} 文件 MIME 类型，无法识别时返回空字符串。
 */
export function getFileMimeType(file: File): string {
  if (file.type) return file.type;

  const extension = file.name.match(/\.([^.]+)$/)?.[1]?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    avif: 'image/avif',
    gif: 'image/gif',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };

  return extension ? mimeTypes[extension] || '' : '';
}

/**
 * @func requestPresignedUrls
 * @desc 为选中的文件请求 R2 PUT 预签名地址。
 * @param {File[]} files 待上传文件列表。
 * @param {string} path R2 目标路径。
 * @returns {Promise<PresignedUrlItem[]>} 预签名地址列表。
 */
export async function requestPresignedUrls(
  files: File[],
  path: string,
): Promise<PresignedUrlItem[]> {
  const response = await fetch('/api/upload/presigned', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'same-origin',
    body: JSON.stringify({
      path,
      files: files.map((file) => ({
        fileName: file.name,
        fileType: getFileMimeType(file),
      })),
    }),
  });
  const result = (await response.json()) as PresignedResponse;

  if (!response.ok || !result.success || !result.data) {
    throw new Error(result.message || '生成预签名上传地址失败');
  }

  return result.data;
}

/**
 * @func uploadWithPresignedUrl
 * @desc 使用预签名地址通过 XMLHttpRequest 直传文件，并回传上传进度。
 * @param {File} file 待上传文件。
 * @param {PresignedUrlItem} presignedUrl 预签名地址信息。
 * @param {(progress: UploadProgressInfo) => void} [progressCallback] 上传进度回调。
 * @param {AbortSignal} [abortSignal] 取消上传信号。
 * @returns {Promise<void>} 上传完成后 resolve。
 * @throws 文件超过限制、请求失败或上传被取消时抛出错误。
 */
export function uploadWithPresignedUrl(
  file: File,
  presignedUrl: PresignedUrlItem,
  progressCallback?: (progress: UploadProgressInfo) => void,
  abortSignal?: AbortSignal,
): Promise<void> {
  if (file.size > presignedUrl.maxFileSize) {
    throw new Error(`文件大小超过 ${presignedUrl.maxFileSize} 字节限制`);
  }

  if (abortSignal?.aborted) {
    throw new Error('上传已中止');
  }

  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    function abortUpload(): void {
      xhr.abort();
    }

    function removeAbortListener(): void {
      abortSignal?.removeEventListener('abort', abortUpload);
    }

    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable) return;
      progressCallback?.({
        progress: Math.round((event.loaded / event.total) * 100),
        loaded: event.loaded,
        total: event.total,
      });
    });

    xhr.addEventListener('load', () => {
      removeAbortListener();
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error(`上传失败，状态码：${xhr.status}`));
    });
    xhr.addEventListener('error', () => {
      removeAbortListener();
      reject(new Error('上传网络错误'));
    });
    xhr.addEventListener('abort', () => {
      removeAbortListener();
      reject(new Error('上传已中止'));
    });

    xhr.open('PUT', presignedUrl.url);
    const fileType = getFileMimeType(file);
    if (fileType) {
      xhr.setRequestHeader('Content-Type', fileType);
    }
    abortSignal?.addEventListener('abort', abortUpload, { once: true });
    xhr.send(file);
  });
}

/**
 * @func formatFileSize
 * @desc 格式化文件体积，便于上传页面展示。
 * @param {number | undefined} size 文件字节数。
 * @returns {string} 已格式化的文件体积。
 */
export function formatFileSize(size?: number): string {
  if (!size || size <= 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = size;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}
