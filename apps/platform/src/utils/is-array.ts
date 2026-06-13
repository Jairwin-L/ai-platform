/**
 * @file
 * 数组判断工具。
 */

/**
 * @func isArrayPolyfill
 * @desc 在缺少 Array.isArray 的运行环境中判断值是否为数组。
 * @param {unknown} v 需要判断的值。
 * @returns {boolean} 如果值是数组则返回 true。
 */
function isArrayPolyfill(v: unknown): boolean {
  return Object.prototype.toString.call(v) === '[object Array]';
}

/**
 * @func isArray
 * @desc 判断一个给定的值是否是数组。在新的浏览器环境中使用 Array.isArray，否则使用 polyfill。
 * @param {unknown} v 需要判断的值。
 *
 * @example
 *
 * import { isArray } from '@jairwinl/utils/esm/isArray';
 *
 * isArray([])
 * // => true
 *
 * isArray({})
 * // => false
 *
 * @returns {boolean} 是数组则返回 true。
 */
export function isArray(v: unknown): boolean {
  if (typeof Array.isArray === 'function') {
    return Array.isArray(v);
  }
  return isArrayPolyfill(v);
}
