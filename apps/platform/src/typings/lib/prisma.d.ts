declare namespace IPrismaClient {
  interface Global {
    prisma?: import('@/generated/prisma/client').PrismaClient;
    prismaPool?: import('pg').Pool;
  }
}

