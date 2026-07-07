/**
 * @file
 * alova 请求实例与基础请求方法。
 */

import { createAlova } from 'alova';
import type { Method, RequestBody } from 'alova';
import fetch from 'alova/fetch';
import ReactHook from 'alova/react';
import { AUTH_ERROR } from '@/constants/error-codes';
import { getMissingPermissionMessage } from '@/constants/permissions';

let alovaMessageApi: IAlovaHttp.MessageApi | null = null;
const PERMISSION_CODE_PATTERN = /^[A-Z][A-Z0-9_]*(?::[A-Z0-9_]+)+$/u;
const PERMISSION_CODE_IN_MESSAGE_PATTERN = /[A-Z][A-Z0-9_]*(?::[A-Z0-9_]+)+/u;

/**
 * @func setAlovaMessageApi
 * @desc 设置 alova 全局提示实例。
 * @param {AlovaMessageApi | null} messageApi Ant Design message 实例。
 * @returns {void}
 */
export function setAlovaMessageApi(messageApi: IAlovaHttp.MessageApi | null): void {
  alovaMessageApi = messageApi;
}

/**
 * @func isApiResponse
 * @desc 判断响应数据是否为统一接口响应结构。
 * @param {unknown} data 响应数据。
 * @returns {data is AlovaApiResponse} 是否为统一接口响应结构。
 */
function isApiResponse(data: unknown): data is IAlovaHttp.ApiResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    ('success' in data || ('code' in data && 'message' in data && 'data' in data))
  );
}

/**
 * @func isErrorResponse
 * @desc 判断响应数据是否包含错误信息结构。
 * @param {unknown} data 响应数据。
 * @returns {data is AlovaErrorResponse} 是否包含错误信息结构。
 */
function isErrorResponse(data: unknown): data is IAlovaHttp.ErrorResponse {
  return typeof data === 'object' && data !== null && 'error' in data;
}

/**
 * @func isFailedApiResponse
 * @desc 判断统一接口响应是否表示业务失败。
 * @param {unknown} data 响应数据。
 * @returns {boolean} 是否为业务失败响应。
 */
function isFailedApiResponse(data: unknown): boolean {
  if (!isApiResponse(data)) {
    return false;
  }

  if (data.success === false) {
    return true;
  }

  if (data.success === true) {
    return false;
  }

  return typeof data.code === 'number' && (data.code < 200 || data.code >= 300);
}

/**
 * @func getResponseErrorCode
 * @desc 获取接口响应中的错误码。
 * @param {unknown} data 响应数据。
 * @returns {string | undefined} 错误码。
 */
function getResponseErrorCode(data: unknown): string | undefined {
  if (isApiResponse(data)) {
    if (typeof data.errorCode === 'string' && data.errorCode) {
      return data.errorCode;
    }

    return typeof data.code === 'string' ? data.code : undefined;
  }

  if (typeof data !== 'object' || data === null || !('errorCode' in data)) {
    return undefined;
  }

  const { errorCode } = data;

  return typeof errorCode === 'string' && errorCode ? errorCode : undefined;
}

/**
 * @func getForbiddenResponseMessage
 * @desc 获取权限错误的安全提示文本，避免暴露内部权限编码。
 * @param {string} message 原始错误提示文本。
 * @returns {string} 安全提示文本。
 */
function getForbiddenResponseMessage(message: string): string {
  const missingPermissionMatch = /^缺少权限[:：]\s*(.+)$/u.exec(message);

  if (missingPermissionMatch) {
    const segments = missingPermissionMatch[1]
      .split(/[,\s，、]+/u)
      .map((code) => code.trim())
      .filter(Boolean);

    const codes = segments.filter((segment) => PERMISSION_CODE_PATTERN.test(segment));

    return codes.length > 0 ? getMissingPermissionMessage(codes) : message;
  }

  if (PERMISSION_CODE_IN_MESSAGE_PATTERN.test(message)) {
    return AUTH_ERROR.FORBIDDEN.message;
  }

  return message;
}

/**
 * @func getSafeResponseMessage
 * @desc 根据错误码归一化面向用户展示的响应提示。
 * @param {unknown} data 响应数据。
 * @param {string} message 原始提示文本。
 * @returns {string} 面向用户展示的提示文本。
 */
function getSafeResponseMessage(data: unknown, message: string): string {
  if (getResponseErrorCode(data) !== AUTH_ERROR.FORBIDDEN.code) {
    return message;
  }

  return getForbiddenResponseMessage(message);
}

/**
 * @func parseResponseBody
 * @desc 安全解析响应体数据。
 * @param {Response} response fetch 响应对象。
 * @returns {Promise<unknown>} 响应体数据。
 */
async function parseResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') ?? '';

  try {
    if (contentType.includes('application/json')) {
      return await response.json();
    }

    return await response.text();
  } catch {
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
  let message = fallback;

  if (isApiResponse(data) && data.message) {
    message = data.message;
  } else if (isErrorResponse(data) && data.error?.message) {
    message = data.error.message;
  } else if (typeof data === 'object' && data !== null && 'message' in data) {
    const { message: responseMessage } = data;

    if (typeof responseMessage === 'string' && responseMessage) {
      message = responseMessage;
    }
  }

  return getSafeResponseMessage(data, message);
}

/**
 * @func showGlobalSuccessMessage
 * @desc 根据请求元数据展示全局成功提示。
 * @param {unknown} data 响应数据。
 * @param {Method | undefined} method 请求方法上下文。
 * @returns {void}
 */
function showGlobalSuccessMessage(data: unknown, method?: Method): void {
  const meta = method?.config.meta;

  if (!meta?.showSuccessMessage) {
    return;
  }

  const content = meta.successMessage ?? getResponseMessage(data, '操作成功');

  alovaMessageApi?.success(content);
}

/**
 * @func shouldShowGlobalErrorMessage
 * @desc 判断当前请求是否应展示全局错误提示。
 * @param {Method | undefined} method 请求方法上下文。
 * @returns {boolean} 是否展示全局错误提示。
 */
function shouldShowGlobalErrorMessage(method?: Method): boolean {
  const meta = method?.config.meta;

  return meta?.showErrorMessage !== false;
}

/**
 * @func isNamedError
 * @desc 判断错误对象是否匹配指定错误名称。
 * @param {unknown} error 错误对象。
 * @param {string} name 错误名称。
 * @returns {boolean} 是否匹配指定错误名称。
 */
function isNamedError(error: unknown, name: string): boolean {
  return error instanceof Error && error.name === name;
}

/**
 * @func isTimeoutError
 * @desc 判断请求错误是否为超时错误。
 * @param {unknown} error 错误对象。
 * @returns {boolean} 是否为超时错误。
 */
function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.message === 'fetchError: network timeout';
}

/**
 * @func isNetworkError
 * @desc 判断请求错误是否为网络连接错误。
 * @param {unknown} error 错误对象。
 * @returns {boolean} 是否为网络连接错误。
 */
function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return ['Failed to fetch', 'Load failed', 'NetworkError'].some((networkMessage) =>
    error.message.includes(networkMessage),
  );
}

/**
 * @func getObjectErrorMessage
 * @desc 获取普通错误对象中的提示文本。
 * @param {unknown} error 错误对象。
 * @returns {string | undefined} 错误提示文本。
 */
function getObjectErrorMessage(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('message' in error)) {
    return undefined;
  }

  const { message: errorMessage } = error;

  return typeof errorMessage === 'string' && errorMessage ? errorMessage : undefined;
}

/**
 * @func normalizeRequestError
 * @desc 归一化全局请求错误，确保错误继续以 Error 抛出。
 * @param {unknown} error 请求错误。
 * @returns {Error} 归一化后的错误对象。
 */
function normalizeRequestError(error: unknown): Error {
  if (isTimeoutError(error)) {
    return new Error('请求超时，请稍后重试');
  }

  if (isNamedError(error, 'AbortError')) {
    return new Error('请求已取消');
  }

  if (isNetworkError(error)) {
    return new Error('网络连接异常，请检查网络后重试');
  }

  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string' && error) {
    return new Error(error);
  }

  return new Error(getObjectErrorMessage(error) ?? '请求失败');
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
 * @func throwResponseError
 * @desc 按请求元数据展示响应错误并抛出错误。
 * @param {string} content 错误提示文本。
 * @param {Method | undefined} method 请求方法上下文。
 * @returns {never}
 */
function throwResponseError(content: string, method?: Method): never {
  if (shouldShowGlobalErrorMessage(method)) {
    showGlobalErrorMessage(content);
  }

  throw new Error(content);
}

/**
 * @func getHttpErrorFallback
 * @desc 获取 HTTP 错误的兜底提示。
 * @param {Response} response fetch 响应对象。
 * @returns {string} HTTP 错误提示。
 */
function getHttpErrorFallback(response: Response): string {
  return response.statusText || `请求失败（${response.status}）`;
}

/**
 * @func getApiResponseData
 * @desc 获取统一接口响应中的业务数据。
 * @param {unknown} data 响应数据。
 * @returns {unknown} 业务数据或原始响应数据。
 */
function getApiResponseData(data: unknown): unknown {
  return isApiResponse(data) ? (data.data ?? null) : data;
}

/**
 * @func onSuccess
 * @desc 解析响应数据并处理全局响应提示。
 * @param {Response} response fetch 响应对象。
 * @param {Method} [method] 请求方法上下文。
 * @returns {Promise<unknown>} 业务数据或原始响应数据。
 */
async function onSuccess(response: Response, method?: Method): Promise<unknown> {
  const data = await parseResponseBody(response);

  if (!response.ok) {
    throwResponseError(getResponseMessage(data, getHttpErrorFallback(response)), method);
  }

  if (isFailedApiResponse(data)) {
    throwResponseError(getResponseMessage(data, '请求失败'), method);
  }

  showGlobalSuccessMessage(data, method);

  return getApiResponseData(data);
}

/**
 * @func onError
 * @desc 处理请求错误并抛出供业务侧捕获。
 * @param {unknown} error 请求错误。
 * @param {Method} [method] 请求方法上下文。
 * @returns {never}
 */
function onError(error: unknown, method?: Method): never {
  const normalizedError = normalizeRequestError(error);

  if (shouldShowGlobalErrorMessage(method)) {
    showGlobalErrorMessage(normalizedError.message);
  }

  throw normalizedError;
}

/**
 * @func beforeRequest
 * @desc 在请求发出前统一补充基础请求配置。
 * @param {Method} method 请求方法上下文。
 * @returns {void}
 */
function beforeRequest(method: Method): void {
  const { config } = method;

  config.headers = {
    Accept: 'application/json',
    ...config.headers,
  };
  config.credentials = config.credentials ?? 'same-origin';
}

/**
 * @func onComplete
 * @desc 统一响应完成入口，预留完成态扩展点。
 * @param {Method} method 请求方法上下文。
 * @returns {void}
 */
function onComplete(method: Method): void {
  void method;
}
export const alovaInstance = createAlova({
  requestAdapter: fetch(),
  statesHook: ReactHook,
  baseURL: '/api',
  timeout: 10000,
  cacheFor: null,
  beforeRequest,
  responded: {
    onSuccess,
    onError,
    onComplete,
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
