/**
 * 构建期导出 OpenAPI 文档。
 *
 * 用 Nest 的 preview 模式实例化依赖图：只解析 controller 与 provider 的元数据，
 * 不跑 onModuleInit，因此不会连 Postgres / Redis，CI 里没有数据库也能生成。
 *
 * 必须以打包产物运行（`vp pack` 后 node dist-openapi/generate-openapi.mjs），不能用 tsx：
 * esbuild 不产出 decorator metadata，用 tsx 跑出来的文档会丢掉参数信息。
 */
import 'reflect-metadata';
import fs from 'node:fs';
import path from 'node:path';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import { buildSwaggerConfig } from '../src/common/http/swagger';

const OUTPUT_PATH = path.join(process.cwd(), 'openapi.json');

async function generate() {
  // PrismaService 构造时要求 DATABASE_URL，preview 模式下不会真的建连，给个占位值即可
  process.env.DATABASE_URL ??= 'postgresql://prisma:prisma@localhost:5432/prisma?schema=public';

  const app = await NestFactory.create(AppModule, {
    preview: true,
    logger: false,
    abortOnError: false,
  });

  const document = SwaggerModule.createDocument(app, buildSwaggerConfig());
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(document, null, 2)}\n`, 'utf-8');
  await app.close();

  const paths = Object.keys(document.paths ?? {}).length;
  console.log(`✅ OpenAPI generated: ${paths} paths -> ${OUTPUT_PATH}`);
}

generate().catch((error) => {
  console.error('❌ Failed to generate OpenAPI spec:', error);
  process.exit(1);
});
