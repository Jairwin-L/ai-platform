import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getPrisma } from '@/lib/prisma';
import { articleQuerySchema, createArticleSchema } from '@/lib/article-schema';

function createSuccessResponse<T>(data: T, message = 'Operation successful', status = 200) {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
      timestamp: Date.now(),
    },
    { status },
  );
}

function createErrorResponse(message: string, status = 500, errorDetail?: unknown) {
  return NextResponse.json(
    {
      success: false,
      message,
      data: null,
      errorDetail: process.env.NODE_ENV === 'development' ? errorDetail : undefined,
      timestamp: Date.now(),
    },
    { status },
  );
}

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

export async function GET(request: NextRequest) {
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

    return createSuccessResponse(
      {
        data: articles,
        total,
        page,
        pageSize,
      },
      'Query successful',
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return createErrorResponse(getValidationMessage(error), 400, error);
    }

    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to query articles',
      500,
      error,
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = createArticleSchema.parse(body);
    const prisma = getPrisma();
    const article = await prisma.article.create({
      data: payload,
    });

    return createSuccessResponse(article, 'Article created successfully', 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return createErrorResponse(getValidationMessage(error), 400, error);
    }

    if (getErrorCode(error) === 'P2002') {
      return createErrorResponse('Slug 已存在，请更换后重试', 409, error);
    }

    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to create article',
      500,
      error,
    );
  }
}
