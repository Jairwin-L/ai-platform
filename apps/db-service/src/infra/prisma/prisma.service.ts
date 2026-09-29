import { Injectable, OnModuleDestroy } from '@nestjs/common';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { registerPrismaClient } from './prisma-client';

// pg 是 CJS 包且动态赋值 module.exports，ESM 下拿不到具名导出，只能默认导入后解构
const { Pool } = pg;

/**
 * Prisma 客户端。
 *
 * 开发态常连远程数据库，建连握手成本远高于查询本身：保持空闲连接不回收 +
 * TCP keepalive，避免每次请求重新握手。
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  private readonly pool: pg.Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL 未配置');
    }

    const isDevelopment = process.env.NODE_ENV !== 'production';
    const pool = new Pool({
      connectionString,
      keepAlive: true,
      ...(isDevelopment ? { idleTimeoutMillis: 0, max: 5 } : {}),
    });

    super({ adapter: new PrismaPg(pool) });
    this.pool = pool;
    registerPrismaClient(this);
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    await this.pool.end();
  }
}
