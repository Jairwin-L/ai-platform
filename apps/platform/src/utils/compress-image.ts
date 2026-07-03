/**
 * @file
 * 浏览器图片压缩工具函数。
 */

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 800;

export type CompressStrategy = IUtils.CompressStrategy;

type CompressApiErrorResponse = IUtils.CompressApiErrorResponse;

const SUPPORTED_MIME_TYPES: Record<CompressStrategy, Set<string>> = {
  sharp: new Set(['image/avif', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']),
  tinify: new Set(['image/avif', 'image/jpeg', 'image/png', 'image/webp']),
};

/**
 * @func delay
 * @desc 等待压缩请求重试。
 * @param {number} ms 等待毫秒数。
 * @returns {Promise<void>} 等待完成后 resolve。
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * @func getCompressErrorMessage
 * @desc 从失败的压缩响应中读取可展示错误信息。
 * @param {Response} response 失败的 fetch 响应。
 * @returns {Promise<string>} 压缩错误信息。
 */
async function getCompressErrorMessage(response: Response): Promise<string> {
  const fallback = `压缩接口错误：${response.status}`;
  const contentType = response.headers.get('Content-Type') || '';

  if (!contentType.includes('application/json')) {
    return fallback;
  }

  try {
    const result = (await response.json()) as CompressApiErrorResponse;
    return result.message || fallback;
  } catch {
    return fallback;
  }
}

/**
 * @func isCompressionSupported
 * @desc 判断当前压缩策略是否支持指定文件类型。
 * @param {File} file 待压缩图片文件。
 * @param {CompressStrategy} strategy 压缩策略。
 * @returns {boolean} 当前文件类型是否支持压缩。
 */
function isCompressionSupported(file: File, strategy: CompressStrategy): boolean {
  return SUPPORTED_MIME_TYPES[strategy].has(file.type);
}

/**
 * @func compressOnce
 * @desc 通过指定服务端策略压缩单个图片。
 * @param {File} file 待压缩图片文件。
 * @param {CompressStrategy} strategy 压缩策略。
 * @returns {Promise<File>} 压缩后的文件；压缩后不更小时返回原文件。
 * @throws 压缩 API 失败或返回非图片内容时抛出错误。
 */
async function compressOnce(file: File, strategy: CompressStrategy): Promise<File> {
  if (!isCompressionSupported(file, strategy)) return file;

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`/api/compress/${strategy}`, {
    method: 'POST',
    credentials: 'same-origin',
    body: formData,
  });
  if (!response.ok) throw new Error(await getCompressErrorMessage(response));

  const contentType = response.headers.get('Content-Type') || '';
  if (!contentType.startsWith('image/')) {
    throw new Error(`响应类型异常：${contentType}`);
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength === 0) throw new Error('压缩结果为空');
  if (buffer.byteLength >= file.size) return file;

  return new File([buffer], file.name, {
    type: contentType,
    lastModified: file.lastModified,
  });
}

/**
 * @func compressWithRetry
 * @desc 按顺序重试图片压缩，重试耗尽后回退原图。
 * @param {File} file 待压缩图片文件。
 * @param {CompressStrategy} strategy 压缩策略。
 * @param {number} attempt 当前重试次数。
 * @returns {Promise<File>} 压缩后的文件；失败时返回原文件。
 */
async function compressWithRetry(
  file: File,
  strategy: CompressStrategy,
  attempt: number,
): Promise<File> {
  try {
    return await compressOnce(file, strategy);
  } catch (error) {
    if (attempt === MAX_RETRIES) {
      console.warn(`[compress] 重试 ${MAX_RETRIES} 次后仍失败，使用原图：`, error);
      return file;
    }

    console.warn(`[compress] 第 ${attempt} 次尝试失败，正在重试：`, error);
    await delay(RETRY_DELAY_MS * attempt);
    return compressWithRetry(file, strategy, attempt + 1);
  }
}

/**
 * @func compressImage
 * @desc 使用指定策略压缩图片，压缩失败时回退原图。
 * @param {File} file 待压缩图片文件。
 * @param {CompressStrategy} strategy 压缩策略。
 * @returns {Promise<File>} 压缩后的文件；失败或不支持时返回原文件。
 */
export async function compressImage(
  file: File,
  strategy: CompressStrategy = 'sharp',
): Promise<File> {
  return compressWithRetry(file, strategy, 1);
}
