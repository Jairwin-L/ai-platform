/**
 * @file 后台列表通用的时间展示工具。
 */
import dayjs from 'dayjs';
import { DATE_FORMAT, EMPTY_PLACEHOLDER } from '@/constants/biz';

/**
 * @func formatDateTime
 * @desc 把接口返回的时间格式化为 `YYYY-MM-DD HH:mm:ss`，空值返回占位符。
 * @param {string | number | Date | null} [value] 接口返回的时间。
 * @returns {string} 格式化后的时间，或占位符。
 * @example
 *
 * formatDateTime('2026-01-01T00:00:00.000Z'); // => '2026-01-01 08:00:00'
 *
 */
export function formatDateTime(value?: string | number | Date | null): string {
  if (!value) return EMPTY_PLACEHOLDER;
  const date = dayjs(value);
  return date.isValid() ? date.format(DATE_FORMAT.Y_M_D_H_M_S) : EMPTY_PLACEHOLDER;
}
