import { Injectable } from '@nestjs/common';
import type { Prisma } from '@/generated/prisma/client';
import { DATA_ERROR } from '@ai/constants/error-codes';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { ApiException } from '@/common/http/api-exception';
import { isRecordNotFoundError, isUniqueConstraintError } from '@/common/utils/prisma-error';
import type { ArticleQuery, CreateArticleInput, UpdateArticleInput } from './schemas';

function getArticleWhere(keyword: string): Prisma.ArticleWhereInput {
  if (!keyword) return {};

  return {
    OR: [
      { title: { contains: keyword, mode: 'insensitive' } },
      { slug: { contains: keyword, mode: 'insensitive' } },
      { summary: { contains: keyword, mode: 'insensitive' } },
    ],
  };
}

@Injectable()
export class ArticlesService {
  constructor(private readonly prisma: PrismaService) {}

  /** 游标分页：多取一条判断是否还有下一页 */
  async list({ cursor, limit, keyword }: ArticleQuery) {
    let articles;
    try {
      articles = await this.prisma.article.findMany({
        where: getArticleWhere(keyword ?? ''),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        cursor: cursor ? { id: cursor } : undefined,
        skip: cursor ? 1 : 0,
        take: limit + 1,
      });
    } catch (error) {
      throw new ApiException(DATA_ERROR.QUERY_FAILED, '文章查询失败', error, 500);
    }
    const hasMore = articles.length > limit;
    const data = hasMore ? articles.slice(0, limit) : articles;

    return {
      data,
      pagination: {
        nextCursor: hasMore ? (data.at(-1)?.id ?? null) : null,
        hasMore,
        limit,
      },
    };
  }

  async findOne(id: string) {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) {
      throw new ApiException(DATA_ERROR.NOT_FOUND, '文章不存在', null, 404);
    }
    return article;
  }

  async create(data: CreateArticleInput) {
    try {
      return await this.prisma.article.create({ data });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ApiException(DATA_ERROR.DUPLICATE_ENTRY, 'Slug 已存在，请更换后重试', null, 409);
      }
      throw new ApiException(DATA_ERROR.CREATE_FAILED, '文章创建失败', error, 500);
    }
  }

  async update(id: string, data: UpdateArticleInput) {
    try {
      return await this.prisma.article.update({ where: { id }, data });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ApiException(DATA_ERROR.DUPLICATE_ENTRY, 'Slug 已存在，请更换后重试', null, 409);
      }
      if (isRecordNotFoundError(error)) {
        throw new ApiException(DATA_ERROR.NOT_FOUND, '文章不存在', null, 404);
      }
      throw new ApiException(DATA_ERROR.UPDATE_FAILED, '文章更新失败', error, 500);
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.article.delete({ where: { id } });
      return { id };
    } catch (error) {
      if (isRecordNotFoundError(error)) {
        throw new ApiException(DATA_ERROR.NOT_FOUND, '文章不存在', null, 404);
      }
      throw new ApiException(DATA_ERROR.DELETE_FAILED, '文章删除失败', error, 500);
    }
  }
}
