import type { LogLevel } from './types';
import { redactSensitiveData, redactText } from '@/lib/ai/security/redact';

const COLORS: Record<LogLevel, string> = {
  trace: '\x1b[90m',
  debug: '\x1b[36m',
  info: '\x1b[32m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  fatal: '\x1b[35m',
};

const RESET = '\x1b[0m';

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
  const message = typeof obj === 'string' ? obj : msg ?? '';
  const extra = typeof obj === 'object' && obj !== null ? (obj as object) : undefined;
  const line = format(level, message, extra);

  if (level === 'error' || level === 'fatal') {
    process.stderr.write(`${line}\n`);
    return;
  }

  if (level === 'warn') {
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
