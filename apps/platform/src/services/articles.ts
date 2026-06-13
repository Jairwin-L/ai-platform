import { alovaDelete, alovaGet, alovaPost, alovaPut } from '@/utils/alova';

export interface Article {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleFormValues {
  title: string;
  slug: string;
  summary?: string | null;
  content: string;
  published?: boolean;
}

export interface ArticleListParams {
  page: number;
  pageSize: number;
  keyword?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ArticleListData {
  data: Article[];
  total: number;
  page: number;
  pageSize: number;
}

function assertApiResponse<T>(response: unknown): ApiResponse<T> {
  const result = response as ApiResponse<T>;

  if (!result.success) {
    throw new Error(result.message || 'Request failed');
  }

  return result;
}

export async function listArticles(params: ArticleListParams) {
  const response = await alovaGet('/api/articles', { ...params });
  return assertApiResponse<ArticleListData>(response).data;
}

export async function createArticle(payload: ArticleFormValues) {
  const response = await alovaPost('/api/articles', payload);
  return assertApiResponse<Article>(response).data;
}

export async function updateArticle(id: string, payload: Partial<ArticleFormValues>) {
  const response = await alovaPut(`/api/articles/${id}`, payload);
  return assertApiResponse<Article>(response).data;
}

export async function deleteArticle(id: string) {
  const response = await alovaDelete(`/api/articles/${id}`);
  return assertApiResponse<{ id: string }>(response).data;
}
