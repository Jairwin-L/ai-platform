import { alovaDelete, alovaGet, alovaPost, alovaPut } from '@/utils/alova';

export interface Article {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  note: string | null;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleFormValues {
  title: string;
  slug: string;
  summary?: string | null;
  content: string;
  note?: string | null;
  published?: boolean;
}

export interface ArticleListParams {
  cursor?: string | null;
  limit?: number;
  keyword?: string;
}

export interface ArticleListPagination {
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
}

export interface ArticleListData {
  data: Article[];
  pagination: ArticleListPagination;
}

export async function listArticles(params: ArticleListParams) {
  return alovaGet<ArticleListData>('/api/articles', { ...params });
}

export async function getArticle(id: string) {
  return alovaGet<Article>(`/api/articles/${id}`);
}

export async function createArticle(payload: ArticleFormValues) {
  return alovaPost<Article>('/api/articles', payload);
}

export async function updateArticle(id: string, payload: Partial<ArticleFormValues>) {
  return alovaPut<Article>(`/api/articles/${id}`, payload);
}

export async function deleteArticle(id: string) {
  return alovaDelete<{ id: string }>(`/api/articles/${id}`);
}
