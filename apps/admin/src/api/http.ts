import { createAlova, type Method } from 'alova';
import adapterFetch from 'alova/fetch';
import { message as antdMessage } from 'antd';
import { LOGIN_PATH } from '@/constants/app';
import { BASE_API_URL } from '@/utils/api';
import { ApiError } from './error';

/** db-service 的统一响应体 */
export type ApiResponse<T> = IHttpCommon.ApiResponse<T>;

/** 单次请求的附加信息，透传给全局响应拦截器。 */
export interface RequestMeta {
  /** 静默失败：不弹全局错误提示，由调用方自行处理。 */
  silent?: boolean;
  /**
   * 只静默成功提示，失败仍按全局规则提示。
   *
   * 用于一次交互里发多个写请求（避免连弹几条），或调用方要按返回内容
   * 给更准确的提示的场景。
   */
  silentSuccess?: boolean;
}

declare module 'alova' {
  interface AlovaCustomTypes {
    meta: RequestMeta;
  }
}

const DEFAULT_TIMEOUT = 30000;
const TIMEOUT_ERROR_FLAG = 'network timeout';

function getRequestMeta(method: Method): RequestMeta {
  return method.meta ?? {};
}

/**
 * 会话失效统一跳登录页。
 *
 * 管理端是 HttpOnly Cookie 会话，前端拿不到也删不掉，
 * 只能靠这里把用户带回登录页重新换一份会话。
 * 已在登录页时 401 只可能是账号密码错误或未登录探测，由登录页自己提示。
 */
function handleUnauthorized() {
  if (window.location.pathname === LOGIN_PATH) return;
  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.assign(`${LOGIN_PATH}?redirectUrl=${encodeURIComponent(currentPath)}`);
}

/** 非 JSON 响应统一包一层，保证调用方永远拿到同一种结构。 */
async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return response.json().catch(() => ({}));
  }
  return {
    success: response.ok,
    data: await response.text(),
    message: response.statusText,
  };
}

function normalizeResponse<T>(result: unknown, response: Response): ApiResponse<T> {
  const payload = result as Partial<ApiResponse<T>> & { msg?: string };
  const success = typeof payload.success === 'boolean' ? payload.success : response.ok;

  return {
    ...payload,
    code: typeof payload.code === 'number' ? payload.code : response.status,
    success,
    message: payload.message || payload.msg || response.statusText,
    timestamp: typeof payload.timestamp === 'number' ? payload.timestamp : Date.now(),
  };
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof Error) {
    if (error.message.includes(TIMEOUT_ERROR_FLAG)) return new ApiError('响应超时，请重试', 408);
    if (error.name === 'AbortError') return new ApiError('请求已取消', 499);
    return new ApiError('网络连接异常，请检查网络后重试', 0);
  }
  return new ApiError('网络请求异常', 0);
}

function notifyError(error: ApiError, silent?: boolean) {
  if (silent) return;
  antdMessage.error(error.message);
}

/** 写操作才提示成功：GET 是列表/详情加载，弹提示只会打扰用户。 */
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * 成功提示统一在这里弹，文案取服务端返回的 message。
 * db-service 每个写接口都会给出具体文案，调用处不需要再各自维护一份。
 */
function notifySuccess(method: Method, response: ApiResponse<unknown>, meta: RequestMeta) {
  if (meta.silent || meta.silentSuccess) return;
  if (!MUTATION_METHODS.has(method.type.toUpperCase())) return;
  if (!response.message) return;
  antdMessage.success(response.message);
}

/**
 * 全局 alova 实例。
 * - 关闭默认缓存：管理端列表必须每次拿最新数据；
 * - credentials 在 request.ts 里固定 include：会话是 Cookie，跨域部署时也要带上。
 */
export const alovaInstance = createAlova({
  baseURL: BASE_API_URL,
  requestAdapter: adapterFetch(),
  timeout: DEFAULT_TIMEOUT,
  cacheFor: null,
  snapshots: 0,
  cacheLogger: false,
  beforeRequest(method) {
    const { headers } = method.config;
    if (!headers.Accept) headers.Accept = 'application/json';
  },
  responded: {
    async onSuccess(response, method) {
      const meta = getRequestMeta(method);
      const normalized = normalizeResponse(await parseResponseBody(response), response);

      if (!response.ok || !normalized.success) {
        const error = new ApiError(
          normalized.message || `请求失败：${response.status}`,
          normalized.code || response.status,
          response.status,
          normalized.data,
          normalized.errorCode,
          normalized.errorDetail,
        );
        if (response.status === 401) {
          handleUnauthorized();
          throw error;
        }
        notifyError(error, meta.silent);
        throw error;
      }

      notifySuccess(method, normalized, meta);
      return normalized;
    },
    onError(error, method) {
      const apiError = toApiError(error);
      notifyError(apiError, getRequestMeta(method).silent);
      throw apiError;
    },
  },
});
