import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getPrisma } from '@/lib/prisma';
import { updateArticleSchema } from '@/lib/article-schema';

interface ArticleRouteContext {
  params: Promise<{
    id: string;
  }>;
}

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

export async function GET(_request: NextRequest, context: ArticleRouteContext) {
  try {
    const { id } = await context.params;
    const prisma = getPrisma();
    const article = await prisma.article.findUnique({ where: { id } });

    if (!article) {
      return createErrorResponse('文章不存在', 404);
    }

    return createSuccessResponse(article, 'Query successful');
  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to query article',
      500,
      error,
    );
  }
}

export async function PUT(request: NextRequest, context: ArticleRouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const payload = updateArticleSchema.parse(body);
    const prisma = getPrisma();
    const article = await prisma.article.update({
      where: { id },
      data: payload,
    });

    return createSuccessResponse(article, 'Article updated successfully');
  } catch (error) {
    if (error instanceof ZodError) {
      return createErrorResponse(getValidationMessage(error), 400, error);
    }

    if (getErrorCode(error) === 'P2002') {
      return createErrorResponse('Slug 已存在，请更换后重试', 409, error);
    }

    if (getErrorCode(error) === 'P2025') {
      return createErrorResponse('文章不存在', 404, error);
    }

    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to update article',
      500,
      error,
    );
  }
}

export async function DELETE(_request: NextRequest, context: ArticleRouteContext) {
  try {
    const { id } = await context.params;
    const prisma = getPrisma();
    await prisma.article.delete({ where: { id } });

    return createSuccessResponse({ id }, 'Article deleted successfully');
  } catch (error) {
    if (getErrorCode(error) === 'P2025') {
      return createErrorResponse('文章不存在', 404, error);
    }

    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to delete article',
      500,
      error,
    );
  }
}
