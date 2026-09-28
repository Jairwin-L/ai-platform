import { createAlova, type Method } from 'alova';
import adapterFetch from 'alova/fetch';
import { message as antdMessage } from 'antd';
import { LOGIN_PATH } from '@/constants/app';
import { BASE_API_URL } from '@/utils/api';
import { ApiError } from './error';

/** 单次请求的附加信息，透传给全局响应拦截器 */
export interface RequestMeta {
  /** 静默失败：不弹全局错误提示，由调用方自行处理 */
  silent?: boolean;
  /** 只静默成功提示，失败仍按全局规则提示 */
  silentSuccess?: boolean;
}

declare module 'alova' {
  interface AlovaCustomTypes {
    meta: RequestMeta;
  }
}

/** db-service 的统一响应体 */
export interface ApiResponse<T> {
  code: number | string;
  success: boolean;
  message: string;
  data: T;
  errorCode?: string;
  timestamp: number;
}

const DEFAULT_TIMEOUT = 30000;
/** 写操作才提示成功：GET 是列表/详情加载，弹提示只会打扰用户 */
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function getRequestMeta(method: Method): RequestMeta {
  return method.meta ?? {};
}

/**
 * 会话失效统一跳登录页。管理后台是 HttpOnly Cookie 会话，前端拿不到也删不掉，
 * 只能把用户带回登录页重新换一份会话；已在登录页时由登录页自己提示。
 */
function handleUnauthorized() {
  if (window.location.pathname === LOGIN_PATH) return;
  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.assign(`${LOGIN_PATH}?redirectUrl=${encodeURIComponent(currentPath)}`);
}

async function parseResponseBody(response: Response): Promise<Partial<ApiResponse<unknown>>> {
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return (await response.json().catch(() => ({}))) as Partial<ApiResponse<unknown>>;
  }
  return { success: response.ok, data: await response.text(), message: response.statusText };
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof Error) {
    if (error.message.includes('network timeout')) return new ApiError('响应超时，请重试', 408);
    if (error.name === 'AbortError') return new ApiError('请求已取消', 499);
    return new ApiError('网络连接异常，请检查网络后重试', 0);
  }
  return new ApiError('网络请求异常', 0);
}

/**
 * 全局 alova 实例。接口成功 / 失败提示统一在这里弹，文案取 db-service 返回的 message，
 * 页面与接口模块不再重复调用 message.success / message.error。
 */
export const alovaInstance = createAlova({
  baseURL: BASE_API_URL,
  requestAdapter: adapterFetch(),
  timeout: DEFAULT_TIMEOUT,
  // 管理后台列表必须每次拿最新数据
  cacheFor: null,
  beforeRequest(method) {
    const { config } = method;
    config.headers = { Accept: 'application/json', ...config.headers };
    // 会话是 Cookie，跨域部署时也要带上
    config.credentials = 'include';
  },
  responded: {
    async onSuccess(response, method) {
      const meta = getRequestMeta(method);
      const body = await parseResponseBody(response);

      if (!response.ok || body.success === false) {
        const error = new ApiError(
          body.message || `请求失败：${response.status}`,
          response.status,
          body.errorCode,
        );
        if (response.status === 401) {
          handleUnauthorized();
          throw error;
        }
        if (!meta.silent) antdMessage.error(error.message);
        throw error;
      }

      if (
        !meta.silent &&
        !meta.silentSuccess &&
        MUTATION_METHODS.has(method.type.toUpperCase()) &&
        body.message
      ) {
        antdMessage.success(body.message);
      }
      return body.data;
    },
    onError(error, method) {
      const apiError = toApiError(error);
      if (!getRequestMeta(method).silent) antdMessage.error(apiError.message);
      throw apiError;
    },
  },
});
