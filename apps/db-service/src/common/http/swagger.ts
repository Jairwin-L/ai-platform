import { DocumentBuilder } from '@nestjs/swagger';
import type { OpenAPIObject } from '@nestjs/swagger';
import type { NestJSReferenceConfiguration } from '@scalar/nestjs-api-reference';
import { ADMIN_SESSION_COOKIE_NAME, AUTH_SESSION_COOKIE_NAME } from '@ai/constants/auth';

const PLATFORM_PATH_PREFIX = '/platform/';
/** 不属于前台或后台任何一方的通用接口，只挂根路径 */
const COMMON_PATH_PREFIXES = ['/upload', '/compress'];
const SCHEMA_REF_PREFIX = '#/components/schemas/';

export function isPlatformPath(path: string) {
  return path.startsWith(PLATFORM_PATH_PREFIX);
}

export function isCommonPath(path: string) {
  return COMMON_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/** /doc 切换器里的文档清单，按受众拆分；第一项是默认打开的文档 */
export const API_DOC_SOURCES = [
  {
    slug: 'platform',
    title: 'Platform API',
    jsonPath: '/doc/platform.json',
    belongsTo: isPlatformPath,
  },
  {
    slug: 'admin',
    title: 'Admin API',
    jsonPath: '/doc/admin.json',
    belongsTo: (path: string) => !isPlatformPath(path) && !isCommonPath(path),
  },
  { slug: 'common', title: 'Common API', jsonPath: '/doc/common.json', belongsTo: isCommonPath },
] as const;

/**
 * Swagger 文档定义：运行期的 `/doc` 与构建期的 `scripts/generate-openapi.ts` 共用这一份。
 */
export function buildSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle('AI Platform API')
    .setVersion('0.1.0')
    .addCookieAuth(AUTH_SESSION_COOKIE_NAME, { type: 'apiKey', in: 'cookie' }, 'userSession')
    .addCookieAuth(ADMIN_SESSION_COOKIE_NAME, { type: 'apiKey', in: 'cookie' }, 'adminSession')
    .build();
}

/**
 * 从全量文档里挑出一部分路由组成单份文档，schema 只保留这些路由（直接或间接）引用到的。
 */
export function pickOpenApiPaths(
  document: OpenAPIObject,
  belongsTo: (path: string) => boolean,
): OpenAPIObject {
  const paths = Object.fromEntries(
    Object.entries(document.paths).filter(([path]) => belongsTo(path)),
  );
  const schemas = document.components?.schemas ?? {};
  const reachable = new Set<string>();
  const pending: unknown[] = [paths];

  while (pending.length > 0) {
    const node = pending.pop();
    if (!node || typeof node !== 'object') continue;
    for (const [key, value] of Object.entries(node)) {
      if (key !== '$ref' || typeof value !== 'string' || !value.startsWith(SCHEMA_REF_PREFIX)) {
        pending.push(value);
        continue;
      }
      const name = value.slice(SCHEMA_REF_PREFIX.length);
      if (!reachable.has(name) && name in schemas) {
        reachable.add(name);
        pending.push(schemas[name]);
      }
    }
  }

  return {
    ...document,
    paths,
    components: {
      ...document.components,
      schemas: Object.fromEntries(Object.entries(schemas).filter(([name]) => reachable.has(name))),
    },
  };
}

/**
 * 是否对外暴露 /doc。生产环境默认隐藏，与迁移前 ENABLE_API_DOCS 的口径一致：
 * 公开仓库 + 公开文档等于把全部接口清单直接给出去，确有需要再显式打开。
 */
export function isApiDocsEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.ENABLE_API_DOCS === 'true';
}

/**
 * Scalar 文档站（/doc）的渲染配置。cdn 固定到具体版本，避免上游发版改变文档站行为。
 */
export function buildScalarConfig(): NestJSReferenceConfiguration {
  return {
    sources: API_DOC_SOURCES.map(({ slug, title, jsonPath }, index) => ({
      slug,
      title,
      url: jsonPath,
      default: index === 0,
    })),
    cdn: 'https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.57.2',
    pageTitle: 'AI Platform API',
  };
}
