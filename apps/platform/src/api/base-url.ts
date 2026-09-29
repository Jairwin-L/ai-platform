/**
 * @file
 * 接口地址前缀，next.config.ts 的 rewrites、alova 与 SSR 请求工具共用这一份。
 *
 * 浏览器端固定走同源前缀：会话是 db-service 下发的 HttpOnly Cookie，
 * 直连 API 域名会让 Cookie 落在 API 域名下，SSR（next/headers 的 cookies()）
 * 和 proxy 中间件都读不到登录态。走同源前缀后 Cookie 归属站点域名，三方一致。
 *
 * 这里会被 next.config.ts 在构建期直接引用，只能放纯常量，不要引入 `@/` 别名或其他模块。
 */

/** 浏览器端接口的同源前缀，由 next.config.ts 的 rewrites 转发到 db-service */
export const API_PROXY_PREFIX = '/api';

/** db-service 上前台接口的命名空间：rewrites 转发目标与 SSR 直连都拼在这个前缀后面 */
export const PLATFORM_API_NAMESPACE = '/platform';

/**
 * db-service 上的通用接口，只挂根路径，不带 `platform/` 命名空间。
 *
 * 浏览器端照样走同源前缀，由 rewrites 转发时去掉前缀。上传、压缩只会从浏览器发起，
 * SSR（`@/api/server`）不调用它们，所以那边不做映射。
 */
export const COMMON_API_PREFIXES = ['/upload', '/compress'];
