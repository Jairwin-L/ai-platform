import { createAlova } from 'alova';
import fetch from 'alova/fetch';
import ReactHook from 'alova/react';

const nodeEnv = process.env.NODE_ENV;
console.log(`nodeEnv----->：`, nodeEnv);
const baseURL = `${process.env.NEXT_PUBLIC_API_URL}`;

export const alovaInstance = createAlova({
  requestAdapter: fetch(),
  statesHook: ReactHook,
  baseURL,
  timeout: 3500,
  cacheFor: null,
  beforeRequest: (method) => {
    method.config.headers = {
      ...method.config.headers,
    };
  },

  // 全局响应拦截
  responded: {
    onSuccess: async (response) => {
      const data = await response.json();
      return data;
    },
    onError: (error) => {
      console.error('Request error:', error);
      throw error;
    },
  },
});
export function alovaGet<T = any>(url: string, params?: Record<string, any>) {
  return alovaInstance.Get<T>(url, { params });
}
export function alovaPost<T = any>(url: string, body?: any) {
  return alovaInstance.Post<T>(url, body);
}
export function alovaPut<T = any>(url: string, body?: any) {
  return alovaInstance.Put<T>(url, body);
}
export function alovaDelete<T = any>(url: string) {
  return alovaInstance.Delete<T>(url);
}
