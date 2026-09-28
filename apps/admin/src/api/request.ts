import type { RequestBody } from 'alova';
import { alovaInstance, type RequestMeta } from './http';

export { ApiError } from './error';

/** 查询参数：空值不拼进 URL */
export type QueryParams = Record<string, unknown>;

function toQueryParams(params?: QueryParams): Record<string, string> | undefined {
  if (!params) return undefined;
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => [key, String(value)]);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

export function get<T>(url: string, params?: QueryParams, meta?: RequestMeta): Promise<T> {
  return alovaInstance.Get<T>(url, { params: toQueryParams(params), meta }).send();
}

export function post<T>(url: string, data?: RequestBody, meta?: RequestMeta): Promise<T> {
  return alovaInstance.Post<T>(url, data, { meta }).send();
}

export function put<T>(url: string, data?: RequestBody, meta?: RequestMeta): Promise<T> {
  return alovaInstance.Put<T>(url, data, { meta }).send();
}

/** DELETE：按 id 删除走查询参数，批量删除的 id 列表放请求体 */
export function del<T>(
  url: string,
  options: { params?: QueryParams; data?: RequestBody } = {},
  meta?: RequestMeta,
): Promise<T> {
  return alovaInstance
    .Delete<T>(url, options.data, { params: toQueryParams(options.params), meta })
    .send();
}
