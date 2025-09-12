function isArrayPolyfill(v: any): boolean {
  return Object.prototype.toString.call(v) === '[object Array]';
}

/**
 * 判断一个给定的值是否是数组。在新的浏览器环境中使用 Array.isArray，否则使用 polyfill
 * @param {any} v 需要判断的值
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
 * @returns {Boolean} 是数组则返回 true
 */
export function isArray(v: any): boolean {
  if (typeof Array.isArray === 'function') {
    return Array.isArray(v);
  }
  return isArrayPolyfill(v);
}
