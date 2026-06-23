import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

interface PrismaGlobal {
  prisma?: PrismaClient;
  prismaPool?: Pool;
}

const globalForPrisma = globalThis as unknown as PrismaGlobal;

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL 未配置');
  }

  const pool = globalForPrisma.prismaPool ?? new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prismaPool = pool;
  }

  return new PrismaClient({ adapter });
}

export function getPrisma() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }

  return globalForPrisma.prisma;
}

const prismaProxyTarget: PrismaClient = Object.create(null);

export const prisma = new Proxy(prismaProxyTarget, {
  get(_target, prop) {
    const client = getPrisma();
    const value = Reflect.get(client, prop, client);

    return typeof value === 'function' ? value.bind(client) : value;
  },
});
