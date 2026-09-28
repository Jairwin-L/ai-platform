/**
 * @file 客户端 IP 的可信取值口径，限流、审计与 BYOK 共用。
 *       不依赖 Nest，BYOK 领域函数与它们的单测可以直接引用。
 */
import type { Request } from 'express';

/**
 * @func getHeader
 * @desc 读取单值请求头；同名头重复出现时取第一项。
 * @param {Request} request Express 请求。
 * @param {string} name 小写的请求头名称。
 * @returns {string | null} 请求头的值，缺失时为 null。
 */
function getHeader(request: Pick<Request, 'headers'>, name: string): string | null {
  const value = request.headers[name];
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/**
 * @func resolveClientIp
 * @desc 取可信的客户端 IP。X-Forwarded-For 的第一段是客户端自己写的，随便伪造；
 *       所以优先用反向代理覆写的 X-Real-IP，其次取 X-Forwarded-For 的最后一段（紧邻本机的那一跳）。
 * @param {Request} request Express 请求。
 * @returns {string | null} 客户端 IP，取不到时为 null，由调用方决定兜底。
 */
export function resolveClientIp(request: Pick<Request, 'headers'>): string | null {
  const realIp = getHeader(request, 'x-real-ip')?.trim();
  if (realIp) return realIp;

  const forwardedFor = getHeader(request, 'x-forwarded-for');
  if (forwardedFor) {
    const hops = forwardedFor
      .split(',')
      .map((hop) => hop.trim())
      .filter(Boolean);
    const last = hops.at(-1);
    if (last) return last;
  }

  return null;
}

/**
 * @func getClientIp
 * @desc 取限流用的客户端 IP：代理头都拿不到时用 TCP 对端地址，再拿不到回落到固定值
 *       （此时该配额退化为全局配额，宁可误伤也不放行）。
 * @param {Request} request Express 请求。
 * @returns {string} 客户端 IP 或 'unknown'。
 */
export function getClientIp(request: Request): string {
  return resolveClientIp(request) ?? request.socket?.remoteAddress ?? 'unknown';
}
