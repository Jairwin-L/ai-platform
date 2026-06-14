/**
 * @file
 * 文章列表服务端数据查询与序列化工具。
 */

import { queryArticles } from '@/app/api/articles/query';
import type { Article as PrismaArticle } from '@prisma/client';
import type { Article, ArticleListData, ArticleListParams } from '@/services/articles';

/**
 * @func transformArticle
 * @desc 将 Prisma 文章记录转换为可传递给客户端组件的数据。
 * @param {PrismaArticle} article Prisma 文章记录。
 * @returns {Article} 客户端文章数据。
 */
function transformArticle(article: PrismaArticle): Article {
  return {
    ...article,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
  };
}

/**
 * @func createEmptyArticleList
 * @desc 创建文章列表查询失败时的兜底首屏数据。
 * @param {ArticleListParams} params 文章列表查询参数。
 * @returns {ArticleListData} 空文章列表数据。
 */
function createEmptyArticleList(params: ArticleListParams): ArticleListData {
  return {
    data: [],
    pagination: {
      nextCursor: null,
      hasMore: false,
      limit: params.limit ?? 10,
    },
  };
}

/**
 * @func fetchArticleList
 * @desc 在服务端查询文章列表首屏数据。
 * @param {ArticleListParams} params 文章列表查询参数。
 * @returns {Promise<ArticleListData>} 文章列表首屏数据。
 */
export async function fetchArticleList(params: ArticleListParams): Promise<ArticleListData> {
  try {
    const result = await queryArticles({
      cursor: params.cursor,
      limit: params.limit ?? 10,
      keyword: params.keyword,
    });

    return {
      data: result.data.map(transformArticle),
      pagination: result.pagination,
    };
  } catch (error) {
    console.error('articles retrieval failed', error);

    return createEmptyArticleList(params);
  }
}
