import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ClientOfflineError, createClient } from 'redis';
import { logger } from '@/infra/logger/logger';
import { registerRedisService } from './redis-commands';

/**
 * 首次连接的等待上限，从发起连接开始算。
 *
 * Redis 一直连不上时 connect() 会按默认策略无限重试、永不 settle：不设上限的话，
 * 触发连接的请求会一直挂起，在途请求又让 app.close() 等不完。
 * 超过上限后改为立即失败，交给各调用方既有的降级；连接仍在后台重试，连上后自动恢复。
 */
const CONNECT_WAIT_MS = 5_000;

export type RedisClient = ReturnType<typeof createClient>;

function getRedisUrl() {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error('REDIS_URL 未配置');
  }
  return url;
}

/**
 * 关闭客户端。close() 要等在途命令得到 Redis 回应，没连上时这个回应永远不会来，
 * 所以只有 ready 时才优雅关闭，否则直接销毁。
 */
export async function closeRedisClient(client: RedisClient | null): Promise<void> {
  if (!client?.isOpen) return;
  if (client.isReady) {
    await client.close();
    return;
  }
  client.destroy();
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: RedisClient | null = null;
  private connectPromise: Promise<unknown> | null = null;
  private connectDeadline = 0;

  constructor() {
    registerRedisService(this);
  }

  private getOrCreateClient(): RedisClient {
    if (!this.client) {
      this.client = createClient({
        url: getRedisUrl(),
        // 关掉离线队列让断线时立即抛 ClientOfflineError：MULTI 里的命令不带超时，
        // 进离线队列的话 Redis 一挂，限流接口会一直挂起，「Redis 不可用时放行」的降级永远走不到
        disableOfflineQueue: true,
      });
      this.client.on('error', (error) => {
        logger.error({ error }, '[redis] client error');
      });
    }
    return this.client;
  }

  async getClient(): Promise<RedisClient> {
    const client = this.getOrCreateClient();

    if (!client.isOpen) {
      this.connectDeadline = Date.now() + CONNECT_WAIT_MS;
      const connecting: Promise<unknown> = client.connect().finally(() => {
        if (this.connectPromise === connecting) this.connectPromise = null;
      });
      // 调用方等到上限就走了，之后 connect 再被拒就没人接；失败原因已由 error 事件记录
      connecting.catch(() => undefined);
      this.connectPromise = connecting;
    }

    if (this.connectPromise) {
      await this.waitForConnect(this.connectPromise);
    }

    return client;
  }

  private async waitForConnect(connecting: Promise<unknown>): Promise<void> {
    const remaining = this.connectDeadline - Date.now();
    if (remaining <= 0) throw new ClientOfflineError();

    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new ClientOfflineError()), remaining);
    });
    try {
      await Promise.race([connecting, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await closeRedisClient(this.client);
  }
}
