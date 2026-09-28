import { redactSensitiveData, redactText } from '@/lib/ai/security/redact';

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const COLORS: Record<LogLevel, string> = {
  trace: '\x1b[90m',
  debug: '\x1b[36m',
  info: '\x1b[32m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  fatal: '\x1b[35m',
};

const RESET = '\x1b[0m';

/**
 * 轻量结构化日志。
 *
 * 写出前统一脱敏：BYOK 与第三方凭据链路的日志里可能混进 API Key、Authorization、Cookie，
 * 仓库公开后日志格式也是公开的，脱敏必须在出口处兜底而不是依赖每个调用方自觉。
 */
function format(level: LogLevel, msg: string, extra?: object) {
  const timestamp = new Date().toISOString();
  const color = COLORS[level];
  const head = `${color}[${timestamp}] ${level.toUpperCase().padEnd(5)}${RESET} ${redactText(msg)}`;

  if (!extra || Object.keys(extra).length === 0) {
    return head;
  }

  const body = JSON.stringify(redactSensitiveData(extra), null, 2)
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');

  return `${head}\n${body}`;
}

function output(level: LogLevel, obj: unknown, msg?: string) {
  const message = typeof obj === 'string' ? obj : (msg ?? '');
  const rawExtra = typeof obj === 'object' && obj !== null ? (obj as object) : undefined;
  // 直接 logger.error(error, 'msg') 时，Error 自身没有可枚举属性，包一层才不会被当成空对象丢掉
  const extra = rawExtra instanceof Error ? { error: rawExtra } : rawExtra;
  const line = format(level, message, extra);

  if (level === 'error' || level === 'fatal' || level === 'warn') {
    process.stderr.write(`${line}\n`);
    return;
  }

  process.stdout.write(`${line}\n`);
}

export const logger = {
  trace: (obj: unknown, msg?: string) => output('trace', obj, msg),
  debug: (obj: unknown, msg?: string) => output('debug', obj, msg),
  info: (obj: unknown, msg?: string) => output('info', obj, msg),
  warn: (obj: unknown, msg?: string) => output('warn', obj, msg),
  error: (obj: unknown, msg?: string) => output('error', obj, msg),
  fatal: (obj: unknown, msg?: string) => output('fatal', obj, msg),
};
