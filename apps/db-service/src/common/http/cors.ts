/**
 * CORS 白名单与响应头，供 bootstrap 的 app.enableCors 使用。
 *
 * 内置名单只放本地开发地址；线上域名一律通过 CORS_ALLOWED_ORIGINS 注入，
 * 仓库是公开的，不在代码里写任何真实域名。
 */
const ALLOWED_METHODS = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
const ALLOWED_HEADERS = 'Content-Type,Accept,Authorization,X-Requested-With';
const MAX_AGE = 86400;

/** 本地开发：platform（8060）与 admin（8050）的 dev server */
const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:8060', 'http://localhost:8050'];

/**
 * 归一化 Origin：去掉末尾斜杠并小写，避免大小写/斜杠差异导致白名单命中失败。
 */
function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '').toLowerCase();
}

/**
 * 把白名单条目编译成正则。`*` 只通配一段（不跨 `.` 与 `/`），
 * 所以 `https://*.example.com` 命中 `https://admin.example.com`，但不会命中 `https://example.com.evil.com`。
 */
function compilePattern(pattern: string): RegExp {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '[^./]+');
  return new RegExp(`^${escaped}$`);
}

/**
 * 允许跨域的来源列表（可含通配符）。CORS_ALLOWED_ORIGINS（逗号分隔）在内置名单之上追加。
 */
export function resolveCorsOrigins(): string[] {
  const configured = (process.env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

  return Array.from(new Set([...DEFAULT_ALLOWED_ORIGINS.map(normalizeOrigin), ...configured]));
}

let allowedOriginPatterns: RegExp[] | null = null;

function getAllowedOriginPatterns(): RegExp[] {
  allowedOriginPatterns ??= resolveCorsOrigins().map(compilePattern);
  return allowedOriginPatterns;
}

/** 判断来源是否在白名单内 */
export function isAllowedOrigin(requestOrigin?: string | null): boolean {
  if (!requestOrigin) return false;

  const origin = normalizeOrigin(requestOrigin);
  return getAllowedOriginPatterns().some((pattern) => pattern.test(origin));
}

export const CORS_METHODS = ALLOWED_METHODS;
export const CORS_HEADERS = ALLOWED_HEADERS;
export const CORS_MAX_AGE = MAX_AGE;
