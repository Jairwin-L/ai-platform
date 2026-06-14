import type { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { getPrisma } from '@/lib/prisma';
import { queryArticles } from './query';
import { articleQuerySchema, createArticleSchema } from '@/lib/article-schema';
import {
  COMMON_ERROR,
  DATA_ERROR,
  createErrorResponse,
  createPaginatedResponse,
  createSuccessResponse,
  withApiHandler,
} from '@/lib/server';

function getValidationMessage(error: ZodError) {
  return error.issues.map((issue) => issue.message).join('；');
}

function getErrorCode(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : undefined;
}

const listArticlesHandler = async (request: NextRequest) => {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const { page, pageSize, keyword } = articleQuerySchema.parse(searchParams);
    const result = await queryArticles({ page, pageSize, keyword });

    return createPaginatedResponse(result.data, result.total, result.page, result.pageSize);
  } catch (error) {
    if (error instanceof ZodError) {
      return createErrorResponse(
        COMMON_ERROR.VALIDATION_ERROR,
        getValidationMessage(error),
        error,
        400,
      );
    }

    return createErrorResponse(DATA_ERROR.QUERY_FAILED, 'Failed to query articles', error, 500);
  }
};

const createArticleHandler = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const payload = createArticleSchema.parse(body);
    const prisma = getPrisma();
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

    return createErrorResponse(DATA_ERROR.CREATE_FAILED, 'Failed to create article', error, 500);
  }
};

export const GET = withApiHandler(listArticlesHandler);
export const POST = withApiHandler(createArticleHandler);
