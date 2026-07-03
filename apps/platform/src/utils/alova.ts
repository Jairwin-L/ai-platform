/**
 * @file
 * alova 请求实例与基础请求方法。
 */

import { createAlova } from 'alova';
import type { RequestBody } from 'alova';
import fetch from 'alova/fetch';
import ReactHook from 'alova/react';

interface AlovaMessageApi {
  success: (content: string) => unknown;
  error: (content: string) => unknown;
}

interface AlovaRequestMeta {
  showSuccessMessage?: boolean;
  successMessage?: string;
}

interface AlovaMethodContext {
  meta?: AlovaRequestMeta;
}

interface AlovaApiResponse {
  success?: boolean;
  message?: string;
}

interface AlovaErrorResponse {
  error?: {
    message?: string;
  };
}

let alovaMessageApi: AlovaMessageApi | null = null;
const shownResponseErrors = new WeakSet<Error>();

/**
 * @func setAlovaMessageApi
 * @desc 设置 alova 全局提示实例。
 * @param {AlovaMessageApi | null} messageApi Ant Design message 实例。
 * @returns {void}
 */
export function setAlovaMessageApi(messageApi: AlovaMessageApi | null): void {
  alovaMessageApi = messageApi;
}

/**
 * @func isApiResponse
 * @desc 判断响应数据是否为统一接口响应结构。
 * @param {unknown} data 响应数据。
 * @returns {data is AlovaApiResponse} 是否为统一接口响应结构。
 */
function isApiResponse(data: unknown): data is AlovaApiResponse {
  return typeof data === 'object' && data !== null && 'success' in data;
}

/**
 * @func isErrorResponse
 * @desc 判断响应数据是否包含错误信息结构。
 * @param {unknown} data 响应数据。
 * @returns {data is AlovaErrorResponse} 是否包含错误信息结构。
 */
function isErrorResponse(data: unknown): data is AlovaErrorResponse {
  return typeof data === 'object' && data !== null && 'error' in data;
}

/**
 * @func isShownError
 * @desc 判断错误是否已经展示过全局提示。
 * @param {unknown} error 错误对象。
 * @returns {boolean} 是否已经展示过全局提示。
 */
function isShownError(error: unknown): boolean {
  return error instanceof Error && shownResponseErrors.has(error);
}

/**
 * @func createShownError
 * @desc 创建已展示全局提示的错误对象。
 * @param {string} message 错误提示文本。
 * @returns {Error} 错误对象。
 */
function createShownError(message: string): Error {
  const error = new Error(message);
  shownResponseErrors.add(error);

  return error;
}

/**
 * @func parseResponseJson
 * @desc 安全解析响应 JSON 数据。
 * @param {Response} response fetch 响应对象。
 * @returns {Promise<unknown>} 响应体 JSON 数据。
 */
async function parseResponseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    // 非 JSON 响应回退到 HTTP 状态提示，避免解析错误覆盖接口语义。
    return null;
  }
}

/**
 * @func getResponseMessage
 * @desc 获取接口响应中的提示文本。
 * @param {unknown} data 响应数据。
 * @param {string} fallback 默认提示。
 * @returns {string} 响应提示文本。
 */
function getResponseMessage(data: unknown, fallback: string): string {
  if (isApiResponse(data) && data.message) {
    return data.message;
  }

  if (isErrorResponse(data) && data.error?.message) {
    return data.error.message;
  }

  if (typeof data === 'object' && data !== null && 'message' in data) {
    const { message } = data;

    if (typeof message === 'string' && message) {
      return message;
    }
  }

  return fallback;
}

/**
 * @func showGlobalSuccessMessage
 * @desc 根据请求元数据展示全局成功提示。
 * @param {unknown} data 响应数据。
 * @param {AlovaMethodContext | undefined} method 请求方法上下文。
 * @returns {void}
 */
function showGlobalSuccessMessage(data: unknown, method?: AlovaMethodContext): void {
  if (!method?.meta?.showSuccessMessage) {
    return;
  }

  const content = method.meta.successMessage ?? getResponseMessage(data, '操作成功');

  alovaMessageApi?.success(content);
}

/**
 * @func getErrorMessage
 * @desc 获取可展示的错误提示文本。
 * @param {unknown} error 错误对象。
 * @param {string} fallback 默认错误提示。
 * @returns {string} 错误提示文本。
 */
function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/**
 * @func showGlobalErrorMessage
 * @desc 展示全局错误提示。
 * @param {string} content 错误提示文本。
 * @returns {void}
 */
function showGlobalErrorMessage(content: string): void {
  alovaMessageApi?.error(content);
}

/**
 * @func throwGlobalResponseError
 * @desc 展示响应错误并抛出已标记错误。
 * @param {string} content 错误提示文本。
 * @returns {never}
 */
function throwGlobalResponseError(content: string): never {
  showGlobalErrorMessage(content);
  throw createShownError(content);
}

/**
 * @func parseSuccessResponse
 * @desc 解析响应 JSON 数据并处理全局成功提示。
 * @param {Response} response fetch 响应对象。
 * @param {AlovaMethodContext} [method] 请求方法上下文。
 * @returns {Promise<unknown>} 响应体 JSON 数据。
 */
async function parseSuccessResponse(
  response: Response,
  method?: AlovaMethodContext,
): Promise<unknown> {
  const data = await parseResponseJson(response);

  if (!response.ok) {
    throwGlobalResponseError(getResponseMessage(data, response.statusText || '请求失败'));
  }

  if (isApiResponse(data) && !data.success) {
    throwGlobalResponseError(getResponseMessage(data, '请求失败'));
  }

  showGlobalSuccessMessage(data, method);

  return data;
}

/**
 * @func handleResponseError
 * @desc 处理请求错误并抛出供业务侧捕获。
 * @param {unknown} error 请求错误。
 * @returns {never}
 */
function handleResponseError(error: unknown): never {
  if (!isShownError(error)) {
    showGlobalErrorMessage(getErrorMessage(error, '请求失败'));
  }

  throw error;
}

export const alovaInstance = createAlova({
  requestAdapter: fetch(),
  statesHook: ReactHook,
  baseURL: '',
  timeout: 10000,
  cacheFor: null,
  responded: {
    onSuccess: parseSuccessResponse,
    onError: handleResponseError,
  },
});

/**
 * @func alovaGet
 * @desc 发起 GET 请求。
 * @param {string} url 请求路径。
 * @param {Record<string, unknown>} [params] 查询参数。
 * @returns {ReturnType<typeof alovaInstance.Get<T>>} alova GET 请求方法实例。
 */
export function alovaGet<T = unknown>(url: string, params?: Record<string, unknown>) {
  return alovaInstance.Get<T>(url, { params });
}

/**
 * @func alovaPost
 * @desc 发起 POST 请求。
 * @param {string} url 请求路径。
 * @param {RequestBody} [body] 请求体。
 * @returns {ReturnType<typeof alovaInstance.Post<T>>} alova POST 请求方法实例。
 */
export function alovaPost<T = unknown>(url: string, body?: RequestBody) {
  return alovaInstance.Post<T>(url, body, { meta: { showSuccessMessage: true } });
}

/**
 * @func alovaPut
 * @desc 发起 PUT 请求。
 * @param {string} url 请求路径。
 * @param {RequestBody} [body] 请求体。
 * @returns {ReturnType<typeof alovaInstance.Put<T>>} alova PUT 请求方法实例。
 */
export function alovaPut<T = unknown>(url: string, body?: RequestBody) {
  return alovaInstance.Put<T>(url, body, { meta: { showSuccessMessage: true } });
}

/**
 * @func alovaDelete
 * @desc 发起 DELETE 请求。
 * @param {string} url 请求路径。
 * @returns {ReturnType<typeof alovaInstance.Delete<T>>} alova DELETE 请求方法实例。
 */
export function alovaDelete<T = unknown>(url: string) {
  return alovaInstance.Delete<T>(url, undefined, { meta: { showSuccessMessage: true } });
}
