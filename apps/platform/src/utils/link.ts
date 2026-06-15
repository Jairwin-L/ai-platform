/**
 * @file 文件/图片链接拼接工具。
 *       将存储后端返回的 key 拼接为可访问的完整 URL，
 *       供页面渲染 <img>/<a> 时统一调用。
 */

import { R2_BUCKET_URL } from '@/constants';
/**
 * @func normalizeStorageKey
 * @desc 去掉对象 key 前导斜杠，避免和 base URL 拼接后产生双斜杠路径。
 * @param {string} key - 存储对象 key。
 * @returns {string} 规范化后的对象 key。
 */
export function normalizeStorageKey(key: string): string {
  return key.replace(/^\/+/, '');
}

/**
 * @func getFileLink
 * @desc 把 R2 中的对象 key 拼接为完整访问链接；空 key 返回空串。
 * @param {string} key - R2 对象 key（不含前导斜杠）
 * @returns {string} 形如 `${R2_BUCKET_URL}/${key}` 的 URL
 */
export function getFileLink(key: string): string {
  if (!key) return '';
  return `${R2_BUCKET_URL}/${normalizeStorageKey(key)}`;
}
