/**
 * TinyPNG REST API 的最小封装。
 *
 * 不用官方 tinify SDK：它的 API Key 是进程级全局变量（tinify.key = ...），
 * 而这里每个请求用的是各自用户保存的 Key，并发请求会互相覆盖，
 * A 用户的图片可能记到 B 用户的额度上。直接调 REST 接口，Key 只随本次请求走。
 */
const TINIFY_SHRINK_URL = 'https://api.tinify.com/shrink';
const REQUEST_TIMEOUT_MS = 30_000;

export class TinifyRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'TinifyRequestError';
  }
}

function getAuthorization(apiKey: string): string {
  return `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`;
}

/** 上游状态码映射成对外状态：Key 或额度问题 429，图片问题 400，服务端问题 503 */
function toPublicStatus(status: number): number {
  if (status === 401 || status === 429) return 429;
  if (status >= 400 && status < 500) return 400;
  return 503;
}

async function readErrorMessage(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => null)) as { message?: unknown } | null;
  return typeof payload?.message === 'string'
    ? payload.message
    : `TinyPNG 请求失败：${response.status}`;
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch {
    throw new TinifyRequestError('连接 TinyPNG 失败', 502);
  }
}

export async function compressWithTinify(input: Buffer, apiKey: string): Promise<Buffer> {
  const authorization = getAuthorization(apiKey);
  const shrinkResponse = await fetchWithTimeout(TINIFY_SHRINK_URL, {
    method: 'POST',
    headers: { Authorization: authorization },
    body: new Uint8Array(input),
  });

  if (!shrinkResponse.ok) {
    throw new TinifyRequestError(
      await readErrorMessage(shrinkResponse),
      toPublicStatus(shrinkResponse.status),
    );
  }

  const outputUrl = shrinkResponse.headers.get('location');
  if (!outputUrl) {
    throw new TinifyRequestError('TinyPNG 未返回压缩结果', 503);
  }

  const outputResponse = await fetchWithTimeout(outputUrl, {
    headers: { Authorization: authorization },
  });
  if (!outputResponse.ok) {
    throw new TinifyRequestError(
      await readErrorMessage(outputResponse),
      toPublicStatus(outputResponse.status),
    );
  }

  return Buffer.from(await outputResponse.arrayBuffer());
}
