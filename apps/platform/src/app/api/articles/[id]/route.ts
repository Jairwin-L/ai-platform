import type { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { getPrisma } from '@/lib/prisma';
import { updateArticleSchema } from '@/lib/article-schema';
import {
  COMMON_ERROR,
  DATA_ERROR,
  createErrorResponse,
  createSuccessResponse,
  withApiHandler,
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

const getArticleHandler = async (_request: NextRequest, context: ApiContext) => {
  try {
    const id = await getArticleId(context);

    if (!id) {
      return createErrorResponse(COMMON_ERROR.PARAM_ERROR, 'Article id is required', null, 400);
    }

    const prisma = getPrisma();
    const article = await prisma.article.findUnique({ where: { id } });

    if (!article) {
      return createErrorResponse(DATA_ERROR.NOT_FOUND, '文章不存在', null, 404);
    }

    return createSuccessResponse(article, 'Query successful');
  } catch (error) {
    return createErrorResponse(DATA_ERROR.QUERY_FAILED, 'Failed to query article', error, 500);
  }
};

const updateArticleHandler = async (request: NextRequest, context: ApiContext) => {
  try {
    const id = await getArticleId(context);

    if (!id) {
      return createErrorResponse(COMMON_ERROR.PARAM_ERROR, 'Article id is required', null, 400);
    }

    const body = await request.json();
    const payload = updateArticleSchema.parse(body);
    const prisma = getPrisma();
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

    return createErrorResponse(DATA_ERROR.UPDATE_FAILED, 'Failed to update article', error, 500);
  }
};

const deleteArticleHandler = async (_request: NextRequest, context: ApiContext) => {
  try {
    const id = await getArticleId(context);

    if (!id) {
      return createErrorResponse(COMMON_ERROR.PARAM_ERROR, 'Article id is required', null, 400);
    }

    const prisma = getPrisma();
    await prisma.article.delete({ where: { id } });

    return createSuccessResponse({ id }, '文章已删除');
  } catch (error) {
    if (getErrorCode(error) === 'P2025') {
      return createErrorResponse(DATA_ERROR.NOT_FOUND, '文章不存在', error, 404);
    }

    return createErrorResponse(DATA_ERROR.DELETE_FAILED, 'Failed to delete article', error, 500);
  }
};

export const GET = withApiHandler(getArticleHandler);
export const PUT = withApiHandler(updateArticleHandler);
export const DELETE = withApiHandler(deleteArticleHandler);
