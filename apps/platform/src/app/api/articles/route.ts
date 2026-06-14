import type { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { getPrisma } from '@/lib/prisma';
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

function throwIfRejected<T>(result: PromiseSettledResult<T>) {
  if (result.status === 'rejected') {
    throw result.reason;
  }

  return result.value;
}

const listArticlesHandler = async (request: NextRequest) => {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const { page, pageSize, keyword } = articleQuerySchema.parse(searchParams);
    const prisma = getPrisma();
    const where = keyword
      ? {
          OR: [
            { title: { contains: keyword, mode: 'insensitive' as const } },
            { slug: { contains: keyword, mode: 'insensitive' as const } },
            { summary: { contains: keyword, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [articlesResult, totalResult] = await Promise.allSettled([
      prisma.article.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.article.count({ where }),
    ]);
    const articles = throwIfRejected(articlesResult);
    const total = throwIfRejected(totalResult);

    return createPaginatedResponse(articles, total, page, pageSize);
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
