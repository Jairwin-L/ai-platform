/**
 * 路由参数的公共 zod schema。路由参数非法一律返回 400（PARAM_ERROR），
 * 文案逐路由传入，前端才知道是哪个 id 有问题。
 */
import { z } from 'zod';

/** 字符串主键：去空白后必须非空 */
export function requiredIdParam(message: string) {
  return z.string(message).trim().min(1, message);
}

/** 自增主键：必须是正整数 */
export function positiveIntParam(message: string) {
  return z.coerce.number(message).int(message).positive(message);
}
