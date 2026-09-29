import type { RedisService } from './redis.service';

let registeredService: RedisService | null = null;

/** RedisService 构造时登记自己，与 Nest 管理的实例共用同一条连接 */
export function registerRedisService(service: RedisService): void {
  registeredService = service;
}

async function getClient() {
  if (!registeredService) {
    throw new Error('RedisService 尚未初始化');
  }
  return registeredService.getClient();
}

/*
 * 下面这组命令函数给 src/lib 下迁移过来的 BYOK / 第三方凭据存储用。
 * 它们原来跑在自研的 RESP 客户端上，签名保持不变，测试可以继续注入内存实现；
 * 实际命令改走 node-redis 的共享连接，不再每条命令新建一次 TCP 连接。
 */

export async function redisGet(key: string): Promise<string | null> {
  return (await getClient()).get(key);
}

export async function redisMGet(keys: string[]): Promise<Array<string | null>> {
  if (keys.length === 0) return [];
  return (await getClient()).mGet(keys);
}

export async function redisSetEx(key: string, seconds: number, value: string): Promise<void> {
  await (await getClient()).set(key, value, { EX: seconds });
}

export async function redisDel(key: string): Promise<void> {
  await (await getClient()).del(key);
}

export async function redisTtl(key: string): Promise<number> {
  return (await getClient()).ttl(key);
}

export async function redisIncr(key: string): Promise<number> {
  return (await getClient()).incr(key);
}

export async function redisDecr(key: string): Promise<number> {
  return (await getClient()).decr(key);
}

export async function redisExpire(key: string, seconds: number): Promise<void> {
  await (await getClient()).expire(key, seconds);
}

export async function redisZAdd(key: string, score: number, member: string): Promise<void> {
  await (await getClient()).zAdd(key, { score, value: member });
}

export async function redisZRangeByScore(
  key: string,
  min: number | string,
  max: number | string,
): Promise<string[]> {
  return (await getClient()).zRangeByScore(key, min, max);
}

export async function redisZRem(key: string, member: string): Promise<void> {
  await (await getClient()).zRem(key, member);
}
