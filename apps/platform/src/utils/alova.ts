/**
 * @file
 * alova 请求实例与基础请求方法。
 */

import { createAlova } from 'alova';
import type { RequestBody } from 'alova';
import fetch from 'alova/fetch';
import ReactHook from 'alova/react';

const baseURL = process.env.NEXT_PUBLIC_API_URL;

export const alovaInstance = createAlova({
  requestAdapter: fetch(),
  statesHook: ReactHook,
  baseURL,
  timeout: 3500,
  cacheFor: null,
  responded: {
    onSuccess: async (response) => {
      const data = await response.json();
      return data;
    },
    onError: (error) => {
      throw error;
    },
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
  return alovaInstance.Post<T>(url, body);
}

/**
 * @func alovaPut
 * @desc 发起 PUT 请求。
 * @param {string} url 请求路径。
 * @param {RequestBody} [body] 请求体。
 * @returns {ReturnType<typeof alovaInstance.Put<T>>} alova PUT 请求方法实例。
 */
export function alovaPut<T = unknown>(url: string, body?: RequestBody) {
  return alovaInstance.Put<T>(url, body);
}

/**
 * @func alovaDelete
 * @desc 发起 DELETE 请求。
 * @param {string} url 请求路径。
 * @returns {ReturnType<typeof alovaInstance.Delete<T>>} alova DELETE 请求方法实例。
 */
export function alovaDelete<T = unknown>(url: string) {
  return alovaInstance.Delete<T>(url);
}
