import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(crypto.scrypt);
const KEY_LENGTH = 64;

/**
 * 与 src/infra/crypto/password.ts 的 hashPassword 同一算法与存储格式（`scrypt:<salt>:<hash>`）。
 * Docker 的迁移镜像只拷贝 prisma 目录，种子脚本读不到 src，只能在这里保留一份；改算法时两处同步。
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('base64url');
  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;

  return `scrypt:${salt}:${derived.toString('base64url')}`;
}
