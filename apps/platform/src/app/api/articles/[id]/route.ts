import type { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { prisma } from '@/lib/prisma';
import { updateArticleSchema } from '@/lib/article-schema';
import {
  COMMON_ERROR,
  DATA_ERROR,
  createErrorResponse,
  createSuccessResponse,
  withPermissionApiHandler,
  type ApiContext,
} from '@/lib/server';

function getValidationMessage(error: ZodError) {
  return error.issues.map((issue) => issue.message).join('；');
}

function getErrorCode(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : undefined;
}

async function getArticleId(context: ApiContext) {
  const params = await context.params;
  const id = params?.id;

  return Array.isArray(id) ? id[0] : id;
}

/**
 * @openapi
 * /api/articles/{id}:
 *   get:
 *     tags:
 *       - Articles
 *     summary: Get article detail
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Article id
 *     responses:
 *       200:
 *         description: 文章详情查询成功
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
 *                   $ref: '#/components/schemas/Article'
 *                 timestamp:
 *                   type: integer
 *                   format: int64
 *       400:
 *         description: 文章 ID 不能为空
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       404:
 *         description: 文章不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       500:
 *         description: 文章查询失败
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *   put:
 *     tags:
 *       - Articles
 *     summary: Update an article
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Article id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             description: 至少需要提交一个文章字段
 *             $ref: '#/components/schemas/ArticleUpdateInput'
 *     responses:
 *       200:
 *         description: 文章更新成功
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
 *                   example: 文章已更新
 *                 data:
 *                   $ref: '#/components/schemas/Article'
 *                 timestamp:
 *                   type: integer
 *                   format: int64
 *       400:
 *         description: 文章 ID 不能为空或参数校验失败
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       404:
 *         description: 文章不存在
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
 *         description: 文章更新失败
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *   delete:
 *     tags:
 *       - Articles
 *     summary: Delete an article
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Article id
 *     responses:
 *       200:
 *         description: 文章删除成功
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
 *                   example: 文章已删除
 *                 data:
 *                   type: object
 *                   required: [id]
 *                   properties:
 *                     id:
 *                       type: string
 *                 timestamp:
 *                   type: integer
 *                   format: int64
 *       400:
 *         description: 文章 ID 不能为空
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       404:
 *         description: 文章不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       500:
 *         description: 文章删除失败
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
const getArticleHandler = async (_request: NextRequest, context: ApiContext) => {
  try {
    const id = await getArticleId(context);

    if (!id) {
      return createErrorResponse(COMMON_ERROR.PARAM_ERROR, '文章 ID 不能为空', null, 400);
    }

    const article = await prisma.article.findUnique({ where: { id } });

    if (!article) {
      return createErrorResponse(DATA_ERROR.NOT_FOUND, '文章不存在', null, 404);
    }

    return createSuccessResponse(article, '查询成功');
  } catch (error) {
    return createErrorResponse(DATA_ERROR.QUERY_FAILED, '文章查询失败', error, 500);
  }
};

const updateArticleHandler = async (request: NextRequest, context: ApiContext) => {
  try {
    const id = await getArticleId(context);

    if (!id) {
      return createErrorResponse(COMMON_ERROR.PARAM_ERROR, '文章 ID 不能为空', null, 400);
    }

    const body = await request.json();
    const payload = updateArticleSchema.parse(body);
    const article = await prisma.article.update({
      where: { id },
      data: payload,
    });

    return createSuccessResponse(article, '文章已更新');
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

    if (getErrorCode(error) === 'P2025') {
      return createErrorResponse(DATA_ERROR.NOT_FOUND, '文章不存在', error, 404);
    }

    return createErrorResponse(DATA_ERROR.UPDATE_FAILED, '文章更新失败', error, 500);
  }
};

const deleteArticleHandler = async (_request: NextRequest, context: ApiContext) => {
  try {
    const id = await getArticleId(context);

    if (!id) {
      return createErrorResponse(COMMON_ERROR.PARAM_ERROR, '文章 ID 不能为空', null, 400);
    }

    await prisma.article.delete({ where: { id } });

    return createSuccessResponse({ id }, '文章已删除');
  } catch (error) {
    if (getErrorCode(error) === 'P2025') {
      return createErrorResponse(DATA_ERROR.NOT_FOUND, '文章不存在', error, 404);
    }

    return createErrorResponse(DATA_ERROR.DELETE_FAILED, '文章删除失败', error, 500);
  }
};

export const GET = withPermissionApiHandler(['ARTICLES:VIEW'], getArticleHandler);
export const PUT = withPermissionApiHandler(['ARTICLES:EDIT'], updateArticleHandler);
export const DELETE = withPermissionApiHandler(['ARTICLES:DELETE'], deleteArticleHandler);
