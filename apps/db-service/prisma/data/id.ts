import { randomFillSync } from 'node:crypto';

/**
 * 用户与 RBAC 表业务主键的 TypeID 前缀，统一取表名单数。
 *
 * 格式参考 TypeID 规范 v0.3（https://github.com/jetify-com/typeid/tree/main/spec）：
 * `前缀_` + 26 位 base32 编码的 UUIDv7，形如 `role_01k5y0m0v8e7tbq3s2w6h9d4xn`。
 * 前缀一眼看出是哪类实体；UUIDv7 按时间有序，做主键时写入局部性比 cuid 好。
 * 前缀一旦上线就不要再改；前缀只能是 `[a-z_]`，首尾必须是字母。
 *
 * 放在 prisma/data 而不是 src：部署用的迁移镜像只拷贝 prisma 目录，种子脚本读不到 src，
 * 服务端经由 src/lib/id.ts 转发，前缀表只维护这一份。
 */
export const ID_PREFIX = {
  user: 'user',
  systemUser: 'system_user',
  userRole: 'user_role',
  role: 'role',
  rolePermission: 'role_permission',
  permission: 'permission',
} as const;

export type IdPrefix = (typeof ID_PREFIX)[keyof typeof ID_PREFIX];

export type TypeId<P extends IdPrefix = IdPrefix> = `${P}_${string}`;

/** Crockford base32 小写字母表：去掉了 i / l / o / u，避免与 1 / 0 混淆 */
const BASE32_ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz';

/**
 * 128 位 UUID 按规范编码为 26 位 base32。
 *
 * 规范要求在高位补 2 个 0 凑成 130 位再按 5 位一组切分，所以首字符恒 ≤ 7；
 * 这和标准 base32（按 40 位分组、末尾补 =）不同，不能直接用通用实现。
 * 用乘除代替移位与掩码（项目 lint 禁用位运算）：非负 BigInt 的除法向下取整，与右移等价。
 */
export function encodeTypeIdSuffix(bytes: Uint8Array): string {
  let value = 0n;
  for (const byte of bytes) value = value * 256n + BigInt(byte);

  const chars = Array.from<string>({ length: 26 });
  for (let index = 25; index >= 0; index -= 1) {
    chars[index] = BASE32_ALPHABET[Number(value % 32n)];
    value /= 32n;
  }
  return chars.join('');
}

/**
 * 字节里随机位能表示的取值个数：字节 6 的高 4 位是版本号、字节 8 的高 2 位是变体位，
 * 只有低位参与随机与计数；其余随机字节 8 位全用。
 */
function getRandomRadix(index: number): number {
  if (index === 6) return 16;
  if (index === 8) return 64;
  return 256;
}

/** 字节 6~15 填随机数，时间戳与版本号、变体位由 withUuidV7Header 写入 */
function createRandomBytes(): Uint8Array {
  const bytes = new Uint8Array(16);
  randomFillSync(bytes, 6, 10);
  return bytes;
}

/**
 * 把 rand_a（字节 6 的低 4 位 + 字节 7）与 rand_b（字节 8 的低 6 位 + 字节 9~15）当作一个整数加 1，
 * 跳过版本号、变体位。返回新数组；返回 null 表示 74 位已经全满溢出。
 */
function incrementRandomBits(bytes: Uint8Array): Uint8Array | null {
  const next = bytes.slice();
  for (let index = 15; index >= 6; index -= 1) {
    const radix = getRandomRadix(index);
    const random = next[index] % radix;
    if (random < radix - 1) {
      next[index] += 1;
      return next;
    }
    // 这一字节的随机位已满：清零后向更高位进位
    next[index] -= random;
  }
  return null;
}

/** 返回写入 48 位毫秒时间戳与版本号、变体位的新数组，随机位原样保留 */
function withUuidV7Header(bytes: Uint8Array, timestamp: number): Uint8Array {
  const result = bytes.slice();
  // 48 位时间戳用乘除拆字节：超过 32 位后位运算会截断
  let rest = timestamp;
  for (let index = 5; index >= 0; index -= 1) {
    result[index] = rest % 256;
    rest = Math.floor(rest / 256);
  }
  result[6] = 0x70 + (result[6] % 16); // 版本号 0111
  result[8] = 0x80 + (result[8] % 64); // 变体位 10
  return result;
}

let lastTimestamp = -1;
/** 上一个 id 的随机位，同一毫秒内在它的基础上递增 */
let lastRandomBytes: Uint8Array = new Uint8Array(16);

/**
 * 生成 UUIDv7（RFC 9562）：前 48 位是毫秒时间戳，其余除版本号、变体位外全是随机数。
 *
 * 同一毫秒内连续生成时，不重新取随机数，而是把上一个的 74 位随机段加 1，
 * 保证同进程内 id 严格递增（RFC 9562 §6.2 的单调计数做法）；随机段溢出或时钟回拨时，
 * 借用下一毫秒的时间戳继续递增。
 */
function createUuidV7Bytes(): Uint8Array {
  const now = Date.now();
  let randomBytes: Uint8Array | null = null;

  if (now > lastTimestamp) {
    lastTimestamp = now;
  } else {
    randomBytes = incrementRandomBits(lastRandomBytes);
    if (!randomBytes) lastTimestamp += 1;
  }

  lastRandomBytes = randomBytes ?? createRandomBytes();
  return withUuidV7Header(lastRandomBytes, lastTimestamp);
}

/**
 * 生成带前缀的业务主键。
 *
 * schema 里这些主键没有 @default，Prisma 的 create 输入会要求显式传 id，漏传在编译期就会报错，
 * 不会悄悄落回 cuid。
 */
export function createId<P extends IdPrefix>(prefix: P): TypeId<P> {
  return `${prefix}_${encodeTypeIdSuffix(createUuidV7Bytes())}`;
}
