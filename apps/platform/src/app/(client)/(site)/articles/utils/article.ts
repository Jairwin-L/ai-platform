/**
 * @file
 * 文章列表与详情的服务端数据查询工具。
 */

import { fetchPlatformApi } from '@/api/server';
import type { Article, ArticleListData, ArticleListParams } from '@/api/modules/articles';

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
 * @func buildArticleListQuery
 * @desc 把文章列表查询参数拼成查询字符串，空值不拼进 URL。
 * @param {ArticleListParams} params 文章列表查询参数。
 * @returns {string} 以 `?` 开头的查询字符串；没有参数时为空串。
 */
function buildArticleListQuery(params: ArticleListParams): string {
  const search = new URLSearchParams();

  if (params.cursor) search.set('cursor', params.cursor);
  if (params.limit) search.set('limit', String(params.limit));
  if (params.keyword) search.set('keyword', params.keyword);

  const query = search.toString();
  return query ? `?${query}` : '';
}

/**
 * @func fetchArticleList
 * @desc 在服务端查询文章列表首屏数据（经 db-service，沿用当前用户的文章查看权限）。
 * @param {ArticleListParams} params 文章列表查询参数。
 * @returns {Promise<ArticleListData>} 文章列表首屏数据；查询失败时返回空列表。
 */
export async function fetchArticleList(params: ArticleListParams): Promise<ArticleListData> {
  const result = await fetchPlatformApi<ArticleListData>(
    `/articles${buildArticleListQuery(params)}`,
  );

  return result ?? createEmptyArticleList(params);
}

/**
 * @func fetchArticleById
 * @desc 在服务端查询单篇文章详情。
 * @param {string} id 文章 ID。
 * @returns {Promise<Article | null>} 文章详情数据；不存在、无权限或查询失败时返回 null。
 */
export async function fetchArticleById(id: string): Promise<Article | null> {
  return fetchPlatformApi<Article>(`/articles/${encodeURIComponent(id)}`);
}
