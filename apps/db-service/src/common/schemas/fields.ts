/**
 * 请求体里反复出现的字段 schema。
 */
import { z } from 'zod';

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

/** 可选 https 链接：空串 / null 归一化为 undefined */
export function optionalHttpsUrl(message: string) {
  return z.preprocess(
    (value) => (value === null || (typeof value === 'string' && !value.trim()) ? undefined : value),
    z.string(message).trim().max(2048, message).refine(isHttpsUrl, message).optional(),
  );
}

/** 必填 https 链接 */
export function requiredHttpsUrl(message: string) {
  return z.string(message).trim().min(1, message).max(2048, message).refine(isHttpsUrl, message);
}
