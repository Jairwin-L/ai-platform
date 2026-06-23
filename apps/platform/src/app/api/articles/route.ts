import type { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { prisma } from '@/lib/prisma';
import { queryArticles } from './query';
import { articleQuerySchema, createArticleSchema } from '@/lib/article-schema';
import {
  COMMON_ERROR,
  DATA_ERROR,
  createErrorResponse,
  createSuccessResponse,
  withPermissionApiHandler,
} from '@/lib/server';

function getValidationMessage(error: ZodError) {
  return error.issues.map((issue) => issue.message).join('；');
}

function getErrorCode(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : undefined;
}

/**
 * @openapi
 * /api/articles:
 *   get:
 *     tags:
 *       - Articles
 *     summary: List articles
 *     parameters:
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Cursor article id for forward pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *           maxLength: 80
 *         description: Search keyword matched against title, slug and summary
 *     responses:
 *       200:
 *         description: 文章列表查询成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [code, success, message, data, timestamp]
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 查询成功
 *                 data:
 *                   $ref: '#/components/schemas/ArticleListData'
 *                 timestamp:
 *                   type: integer
 *                   format: int64
 *       400:
 *         description: Validation failure
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       500:
 *         description: 文章列表查询失败
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *   post:
 *     tags:
 *       - Articles
 *     summary: Create an article
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ArticleFormInput'
 *     responses:
 *       201:
 *         description: 文章创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [code, success, message, data, timestamp]
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 201
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 文章已创建
 *                 data:
 *                   $ref: '#/components/schemas/Article'
 *                 timestamp:
 *                   type: integer
 *                   format: int64
 *       400:
 *         description: Validation failure
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       409:
 *         description: Slug 已存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       500:
 *         description: 文章创建失败
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
const listArticlesHandler = async (request: NextRequest) => {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const { cursor, limit, keyword } = articleQuerySchema.parse(searchParams);
    const result = await queryArticles({ cursor, limit, keyword });

    return createSuccessResponse(result, '查询成功');
  } catch (error) {
    if (error instanceof ZodError) {
      return createErrorResponse(
        COMMON_ERROR.VALIDATION_ERROR,
        getValidationMessage(error),
        error,
        400,
      );
    }

    return createErrorResponse(DATA_ERROR.QUERY_FAILED, '文章查询失败', error, 500);
  }
};

const createArticleHandler = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const payload = createArticleSchema.parse(body);
    const article = await prisma.article.create({
      data: payload,
    });

    return createSuccessResponse(article, '文章已创建', 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return createErrorResponse(
        COMMON_ERROR.VALIDATION_ERROR,
        getValidationMessage(error),
        error,
        400,
      );
    }

    if (getErrorCode(error) === 'P2002') {
      return createErrorResponse(
        DATA_ERROR.DUPLICATE_ENTRY,
        'Slug 已存在，请更换后重试',
        error,
        409,
      );
    }

    return createErrorResponse(DATA_ERROR.CREATE_FAILED, '文章创建失败', error, 500);
  }
};

export const GET = withPermissionApiHandler(['ARTICLES:VIEW'], listArticlesHandler);
export const POST = withPermissionApiHandler(['ARTICLES:ADD'], createArticleHandler);
