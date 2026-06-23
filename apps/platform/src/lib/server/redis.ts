import { Socket, connect as connectNet } from 'node:net';
import { TLSSocket, connect as connectTls } from 'node:tls';

type RedisValue = string | number | null;

const REDIS_COMMAND_TIMEOUT_MS = 5000;

function encodeCommand(parts: string[]): string {
  return `*${parts.length}\r\n${parts
    .map((part) => `$${Buffer.byteLength(part)}\r\n${part}\r\n`)
    .join('')}`;
}

function getRedisUrl(): URL {
  const url = process.env.REDIS_URL;

  if (!url) {
    throw new Error('REDIS_URL 未配置');
  }

  return new URL(url);
}

function createSocket(url: URL): Socket | TLSSocket {
  const port = Number(url.port || (url.protocol === 'rediss:' ? 6380 : 6379));
  const host = url.hostname;

  if (url.protocol === 'rediss:') {
    return connectTls({ host, port, servername: host });
  }

  return connectNet({ host, port });
}

function getReadyEvent(url: URL): 'connect' | 'secureConnect' {
  return url.protocol === 'rediss:' ? 'secureConnect' : 'connect';
}

function parseSimpleResponse(
  buffer: Buffer,
  offset = 0,
): { nextOffset: number; value: RedisValue } | null {
  const marker = buffer.subarray(offset, offset + 1).toString();
  const payload = buffer.subarray(offset + 1).toString();
  const lineEnd = buffer.indexOf('\r\n', offset);

  if (lineEnd < 0) {
    return null;
  }

  if (marker === '+') {
    return { nextOffset: lineEnd + 2, value: payload.split('\r\n')[0] };
  }

  if (marker === ':') {
    return { nextOffset: lineEnd + 2, value: Number(payload.split('\r\n')[0]) };
  }

  if (marker === '-') {
    throw new Error(payload.split('\r\n')[0] || 'Redis 命令执行失败');
  }

  if (marker === '$') {
    const [sizeText] = payload.split('\r\n');
    const size = Number(sizeText);

    if (size < 0) {
      return { nextOffset: lineEnd + 2, value: null };
    }

    const start = lineEnd + 2;
    const end = start + size;

    if (buffer.length < end + 2) {
      return null;
    }

    return { nextOffset: end + 2, value: buffer.subarray(start, end).toString() };
  }

  throw new Error('不支持的 Redis 响应');
}

async function runRawRedisCommand(parts: string[]): Promise<RedisValue> {
  const url = getRedisUrl();

  return new Promise((resolve, reject) => {
    const socket = createSocket(url);
    const chunks: Buffer[] = [];
    let expectedReplies = 1;
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error('Redis 命令执行超时'));
    }, REDIS_COMMAND_TIMEOUT_MS);

    function cleanup(): void {
      clearTimeout(timeout);
      socket.removeAllListeners();
    }

    socket.once('error', (error) => {
      cleanup();
      reject(error);
    });

    socket.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
      const buffer = Buffer.concat(chunks);
      let offset = 0;
      let value: RedisValue = null;
      let replyCount = 0;

      try {
        while (replyCount < expectedReplies) {
          const parsed = parseSimpleResponse(buffer, offset);

          if (!parsed) {
            return;
          }

          value = parsed.value;
          offset = parsed.nextOffset;
          replyCount += 1;
        }
      } catch (error) {
        cleanup();
        socket.destroy();
        reject(error);
        return;
      }

      cleanup();
      resolve(value);
      socket.end();
    });

    socket.once(getReadyEvent(url), () => {
      const commands: string[] = [];
      const password = decodeURIComponent(url.password || '');
      const username = decodeURIComponent(url.username || '');
      const db = url.pathname.replace('/', '');

      if (password) {
        commands.push(encodeCommand(username ? ['AUTH', username, password] : ['AUTH', password]));
      }

      if (db) {
        commands.push(encodeCommand(['SELECT', db]));
      }

      commands.push(encodeCommand(parts));
      expectedReplies = commands.length;
      socket.write(commands.join(''));
    });
  });
}

export async function redisGet(key: string): Promise<string | null> {
  const value = await runRawRedisCommand(['GET', key]);
  return typeof value === 'string' ? value : null;
}

export async function redisSetEx(key: string, seconds: number, value: string): Promise<void> {
  await runRawRedisCommand(['SET', key, value, 'EX', String(seconds)]);
}

export async function redisDel(key: string): Promise<void> {
  await runRawRedisCommand(['DEL', key]);
}
