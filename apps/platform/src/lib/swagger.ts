import fs from 'node:fs';
import path from 'node:path';
import { createSwaggerSpec } from 'next-swagger-doc';

const OPENAPI_INFO = {
  title: 'Next.js Starter Kit API Docs',
  version: '0.1.0',
  description: 'Next.js Starter Kit API documentation, conforming to OpenAPI 3.0 specification',
} as const;

export const openApiDefinition = {
  openapi: '3.0.0',
  info: OPENAPI_INFO,
  tags: [
    { name: 'Demo', description: 'Demo endpoints' },
    { name: 'Articles', description: 'Article CRUD endpoints' },
  ],
  components: {
    schemas: {
      ApiErrorResponse: {
        type: 'object',
        required: ['code', 'success', 'message', 'errorCode', 'data', 'timestamp'],
        properties: {
          code: { type: 'integer', example: 10004 },
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: '数据校验失败' },
          errorCode: { type: 'string', example: '10004' },
          errorDetail: { nullable: true },
          data: { nullable: true, example: null },
          timestamp: { type: 'integer', format: 'int64', example: 1735689600000 },
        },
      },
      Article: {
        type: 'object',
        required: ['id', 'title', 'slug', 'content', 'published', 'createdAt', 'updatedAt'],
        properties: {
          id: { type: 'string', example: 'clx0000000000000000000000' },
          title: { type: 'string', maxLength: 120, example: 'Hello Next.js' },
          slug: { type: 'string', maxLength: 160, example: 'hello-nextjs' },
          summary: { type: 'string', maxLength: 240, nullable: true, example: 'Article summary' },
          content: { type: 'string', example: 'Article content' },
          note: { type: 'string', nullable: true, example: 'Article note in Markdown' },
          published: { type: 'boolean', default: false },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ArticleFormInput: {
        type: 'object',
        required: ['title', 'slug', 'content'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 120 },
          slug: {
            type: 'string',
            minLength: 1,
            maxLength: 160,
            pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
          },
          summary: { type: 'string', maxLength: 240, nullable: true },
          content: { type: 'string', minLength: 1 },
          note: { type: 'string', nullable: true },
          published: { type: 'boolean', default: false },
        },
      },
      ArticleUpdateInput: {
        type: 'object',
        minProperties: 1,
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 120 },
          slug: {
            type: 'string',
            minLength: 1,
            maxLength: 160,
            pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
          },
          summary: { type: 'string', maxLength: 240, nullable: true },
          content: { type: 'string', minLength: 1 },
          note: { type: 'string', nullable: true },
          published: { type: 'boolean' },
        },
      },
      ArticleListPagination: {
        type: 'object',
        required: ['nextCursor', 'hasMore', 'limit'],
        properties: {
          nextCursor: { type: 'string', nullable: true },
          hasMore: { type: 'boolean' },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
        },
      },
      ArticleListData: {
        type: 'object',
        required: ['data', 'pagination'],
        properties: {
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/Article' },
          },
          pagination: { $ref: '#/components/schemas/ArticleListPagination' },
        },
      },
      DemoData: {
        type: 'string',
        example: 'Hello',
      },
    },
  },
} as const;

/**
 * 读取或动态生成 OpenAPI 规范。
 * - 优先返回 public/openapi.json 构建产物
 * - 开发期文件不存在时回退到动态生成并保存
 */
export async function getApiDocs(forceGenerate = false) {
  const publicPath = path.join(process.cwd(), 'public', 'openapi.json');

  if (!forceGenerate && fs.existsSync(publicPath)) {
    try {
      return JSON.parse(fs.readFileSync(publicPath, 'utf-8'));
    } catch (error) {
      console.error('读取 OpenAPI 文件失败，正在重新生成：', error);
    }
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '缺少 OpenAPI 规范文件，请先在构建期间执行 `vp run openapi:generate`。',
    );
  }

  const spec = createSwaggerSpec({
    apiFolder: 'src/app/api',
    definition: openApiDefinition,
  });

  try {
    fs.writeFileSync(publicPath, JSON.stringify(spec, null, 2), 'utf-8');
  } catch (error) {
    console.error('写入 OpenAPI 文件失败：', error);
  }

  return spec;
}
