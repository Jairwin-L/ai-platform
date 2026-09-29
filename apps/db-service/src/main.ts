import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { apiReference } from '@scalar/nestjs-api-reference';
import { z } from 'zod';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { logger } from '@/infra/logger/logger';
import { CORS_HEADERS, CORS_MAX_AGE, CORS_METHODS, isAllowedOrigin } from '@/common/http/cors';
import {
  API_DOC_SOURCES,
  buildScalarConfig,
  buildSwaggerConfig,
  isApiDocsEnabled,
  pickOpenApiPaths,
} from '@/common/http/swagger';
import { AppStandardSchemaValidationPipe } from '@/common/pipes/standard-schema-validation.pipe';

/**
 * JSON 序列化规则，与迁移前 Next 版本 createSuccessResponse 的 serialize 保持一致：
 * - BigInt 转字符串（JSON 唯一序列化不了的类型）；
 * - `id` / `*_id` / `*Id` 字段的数字转字符串。角色、权限在库里是自增整数，
 *   前台与后台一直按字符串使用它们，这里统一转换，接口契约不变。
 */
function jsonReplacer(key: string, value: unknown) {
  if (typeof value === 'bigint') return value.toString();
  if ((key === 'id' || key.endsWith('_id') || key.endsWith('Id')) && typeof value === 'number') {
    return value.toString();
  }
  return value;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // 同一个 (method, path) 注册两次一定是 bug，直接拒绝启动
    routeConflictPolicy: { duplicate: 'error', shadow: 'warn' },
    // 按路由具体程度匹配，字面量路由不会被参数路由吞掉，注册顺序不再影响结果
    routeResolutionStrategy: 'specificity',
    // 滚动更新时新请求直接 503，在途请求正常跑完
    return503OnClosing: true,
  });

  app.set('json replacer', jsonReplacer);
  app.use(cookieParser());
  app.useGlobalPipes(new AppStandardSchemaValidationPipe());
  // zod 内置校验文案统一中文，与迁移前的接口提示保持一致
  z.config(z.locales.zhCN());
  // Prisma / Redis 的 onModuleDestroy 只在 app.close() 时触发，不开这个钩子容器收到 SIGTERM 会直接被杀
  app.enableShutdownHooks();
  app.enableCors({
    origin: (origin, callback) => callback(null, !origin || isAllowedOrigin(origin)),
    credentials: true,
    methods: CORS_METHODS,
    allowedHeaders: CORS_HEADERS,
    maxAge: CORS_MAX_AGE,
  });
  // JSON 接口不需要 CSP，唯一的 HTML 是 /doc 的 Scalar，默认 CSP 会让文档页白屏；其余头保持 helmet 默认
  app.useSecurityHeaders({ contentSecurityPolicy: false });
  // 同源请求（含 platform 经 rewrites 转发的请求）由 Sec-Fetch-Site 直接放行，服务端调用没有浏览器头也放行；
  // 被拦下的只剩跨源写请求，其中 CORS 白名单内的来源（管理后台）豁免
  app.enableCsrfProtection({
    exclude: (request: Request) => isAllowedOrigin(request.headers.origin),
  });

  if (isApiDocsEnabled()) {
    const openApiDocument = SwaggerModule.createDocument(app, buildSwaggerConfig());
    // 先注册各 JSON 路由：Scalar 挂在 /doc 上是前缀匹配，反过来注册会把 JSON 请求吞掉
    app.use('/doc/json', (_req: Request, res: Response) => res.json(openApiDocument));
    for (const { jsonPath, belongsTo } of API_DOC_SOURCES) {
      const document = pickOpenApiPaths(openApiDocument, belongsTo);
      app.use(jsonPath, (_req: Request, res: Response) => res.json(document));
    }
    app.use('/doc', apiReference(buildScalarConfig()));
  }

  const port = Number(process.env.PORT || 8070);
  await app.listen(port);
  logger.info({ port }, `🚀 db-service listening on http://localhost:${port}`);
}

void bootstrap().catch((error) => {
  logger.fatal({ error }, 'db-service bootstrap failed');
  process.exit(1);
});
