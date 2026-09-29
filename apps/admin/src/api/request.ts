import type { RequestBody } from 'alova';
import type { FetchRequestInit } from 'alova/fetch';
import { alovaInstance, type ApiResponse, type RequestMeta } from './http';
import { ApiError } from './error';

export { ApiError };
export type { ApiResponse, RequestMeta };

/** 查询参数：值会按类型转成字符串后再编码。 */
export type QueryParams = Record<string, unknown>;

/** 请求体：普通对象会被序列化成 JSON，FormData 等原生类型直接透传。 */
export type RequestData = RequestBody | null;

export interface RequestOptions {
  /** 超时毫秒数，默认 30000。 */
  timeout?: number;
  /** 自定义请求头。 */
  headers?: Record<string, string>;
  /** 是否复用同时发起的相同请求，默认 true。 */
  shareRequest?: boolean;
  /** 请求元信息，见 RequestMeta。 */
  meta?: RequestMeta;
}

interface RequestConfig extends RequestOptions {
  method?: string;
  params?: QueryParams;
  data?: RequestData;
}

type MethodConfig = FetchRequestInit & {
  params?: string;
  headers?: Record<string, string>;
  timeout?: number;
  shareRequest?: boolean;
  meta?: RequestMeta;
};

function formatQueryValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return value.toString();
  }
  if (value instanceof Date) return value.toISOString();
  return JSON.stringify(value);
}

/**
 * alova 内建的 params 拼接不会做 encode，也不会剔除空值，
 * 这里先用 URLSearchParams 拼成字符串再交给 alova。
 */
function buildQueryString(params?: QueryParams): string {
  if (!params) return '';

  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.append(key, formatQueryValue(value));
  });

  return search.toString();
}

function createMethodConfig(options: RequestConfig): MethodConfig {
  const { headers, meta, params, shareRequest, timeout } = options;
  // 管理端会话是 Cookie，所有请求都要带上凭证
  const config: MethodConfig = { credentials: 'include' };

  const query = buildQueryString(params);
  // alova 会把 config 上显式的 undefined 覆盖到全局配置上，所以只挂有值的字段。
  if (query) config.params = query;
  if (headers) config.headers = { ...headers };
  if (timeout !== undefined) config.timeout = timeout;
  if (shareRequest !== undefined) config.shareRequest = shareRequest;
  if (meta) config.meta = meta;

  return config;
}

function send<T>(url: string, options: RequestConfig): Promise<T> {
  const { data, method = 'GET' } = options;
  const config = createMethodConfig(options);
  const body = data ?? undefined;

  switch (method.toUpperCase()) {
    case 'POST':
      return alovaInstance.Post<T>(url, body, config).send();
    case 'PUT':
      return alovaInstance.Put<T>(url, body, config).send();
    case 'PATCH':
      return alovaInstance.Patch<T>(url, body, config).send();
    case 'DELETE':
      return alovaInstance.Delete<T>(url, body, config).send();
    default:
      return alovaInstance.Get<T>(url, config).send();
  }
}

export function request<T = unknown>(
  url: string,
  options: RequestConfig = {},
): Promise<ApiResponse<T>> {
  return send<ApiResponse<T>>(url, options);
}

export function get<T = unknown>(
  url: string,
  params?: QueryParams,
  options?: RequestOptions,
): Promise<ApiResponse<T>> {
  return request<T>(url, { ...options, method: 'GET', params });
}

export function post<T = unknown>(
  url: string,
  data?: RequestData,
  options?: RequestOptions,
): Promise<ApiResponse<T>> {
  return request<T>(url, { ...options, method: 'POST', data });
}

export function put<T = unknown>(
  url: string,
  data?: RequestData,
  options?: RequestOptions,
): Promise<ApiResponse<T>> {
  return request<T>(url, { ...options, method: 'PUT', data });
}

export function patch<T = unknown>(
  url: string,
  data?: RequestData,
  options?: RequestOptions,
): Promise<ApiResponse<T>> {
  return request<T>(url, { ...options, method: 'PATCH', data });
}

export function del<T = unknown>(
  url: string,
  params?: QueryParams,
  options?: RequestOptions,
): Promise<ApiResponse<T>> {
  return request<T>(url, { ...options, method: 'DELETE', params });
}
