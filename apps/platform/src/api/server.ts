/**
 * @file
 * 服务端渲染专用的 db-service 请求工具。
 *
 * 浏览器端统一走同源 `/api` 前缀（next.config.ts 的 rewrites 转发到 db-service），
 * 会话 Cookie 因此落在站点域名下；SSR 没有浏览器上下文，直接用内网地址 API_INTERNAL_ORIGIN
 * 访问 db-service，并把当前请求的 Cookie 原样带过去。
 */
import { cookies } from 'next/headers';
import { PLATFORM_API_NAMESPACE } from './base-url';

// 这份工具会读取 next/headers，被打进客户端 bundle 一定是误用，早失败早发现
if (typeof window !== 'undefined') {
  throw new Error('[api/server] 只能在服务端使用，客户端组件请改用 @/api/alova');
}

/** 内网一跳，正常在毫秒级；db-service 卡住时宁可降级也不要把页面渲染一起拖死 */
const SERVER_REQUEST_TIMEOUT_MS = 5000;

/**
 * @func getApiInternalOrigin
 * @desc 读取 db-service 的内网地址。
 * @returns {string | null} 去掉末尾斜杠的绝对地址；未配置或格式不对时为 null。
 */
function getApiInternalOrigin(): string | null {
  const origin = process.env.API_INTERNAL_ORIGIN;
  return origin && /^https?:\/\//.test(origin) ? origin.replace(/\/+$/, '') : null;
}

/**
 * @func fetchPlatformApi
 * @desc 在服务端请求 db-service 的前台接口，自动带上当前请求的 Cookie。
 * @param {string} path 前台接口路径（不含 `/platform` 前缀），如 `/me`。
 * @returns {Promise<T | null>} 业务数据；未登录、无权限、接口不可用时都返回 null，由页面决定降级方式。
 */
export async function fetchPlatformApi<T>(path: string): Promise<T | null> {
  const origin = getApiInternalOrigin();

  if (!origin) {
    console.error('[api/server] 缺少可用的接口地址，请配置 API_INTERNAL_ORIGIN');
    return null;
  }

  const cookieHeader = (await cookies()).toString();

  try {
    const response = await fetch(`${origin}${PLATFORM_API_NAMESPACE}${path}`, {
      headers: { Accept: 'application/json', ...(cookieHeader ? { cookie: cookieHeader } : {}) },
      cache: 'no-store',
      signal: AbortSignal.timeout(SERVER_REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      // 401 / 403 / 404 是正常的业务结果，不记错误日志
      if (response.status >= 500) {
        console.error(`[api/server] GET ${path} -> ${response.status}`);
      }
      return null;
    }

    const body = (await response.json()) as IAlovaHttp.ApiResponse<T>;
    return body.success === false ? null : (body.data ?? null);
  } catch (error) {
    console.error(`[api/server] GET ${path} failed`, error);
    return null;
  }
}
