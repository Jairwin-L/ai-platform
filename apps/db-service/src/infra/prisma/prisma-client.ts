import type { PrismaClient } from '@/generated/prisma/client';

let registeredClient: PrismaClient | null = null;

/** PrismaService 构造时登记自己，全进程只有这一个连接池 */
export function registerPrismaClient(client: PrismaClient): void {
  registeredClient = client;
}

/**
 * 给 src/lib 下的领域函数用的 Prisma 入口。
 *
 * BYOK、AI 对话、第三方服务配置这几块是从原 Next API 整体迁过来的纯函数，
 * 测试靠 `vi.mock('@/infra/prisma/prisma-client')` 替换数据层；把它们改成 Nest provider
 * 要连测试一起重写，收益只是换一种取依赖的写法。这里转发到 Nest 管理的同一个 PrismaService，
 * 连接池、优雅退出仍由 Nest 负责。新写的模块请直接注入 PrismaService，不要再用它。
 */
// Proxy 的 target 只是占位，所有属性访问都转发到已登记的实例
const placeholder: object = {};

export const prisma = new Proxy(placeholder as PrismaClient, {
  get(_target, prop) {
    if (!registeredClient) {
      throw new Error('PrismaService 尚未初始化');
    }
    const value = Reflect.get(registeredClient, prop, registeredClient);
    return typeof value === 'function' ? value.bind(registeredClient) : value;
  },
});
