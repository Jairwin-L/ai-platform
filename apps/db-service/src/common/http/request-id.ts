/**
 * @file 请求 id 生成工具，请求日志与 BYOK 审计共用 `req_<uuid>` 格式。
 */
import { randomUUID } from 'node:crypto';

/**
 * @func createRequestId
 * @desc 生成新的请求 id。
 * @returns {string} 形如 `req_<uuid>` 的请求 id。
 */
export function createRequestId(): string {
  return `req_${randomUUID()}`;
}
