import { alovaDelete, alovaGet, alovaPost, alovaPut } from '@/api/alova';

export type Article = IApiArticles.Article;
export type ArticleFormValues = IApiArticles.ArticleFormValues;
export type ArticleListData = IApiArticles.ArticleListData;
export type ArticleListPagination = IApiArticles.ArticleListPagination;
export type ArticleListParams = IApiArticles.ArticleListParams;

export async function listArticles(params: ArticleListParams) {
  return alovaGet<ArticleListData>('/articles', { ...params });
}

export async function getArticle(id: string) {
  return alovaGet<Article>(`/articles/${id}`);
}

export async function createArticle(payload: ArticleFormValues) {
  return alovaPost<Article>('/articles', payload);
}

export async function updateArticle(id: string, payload: Partial<ArticleFormValues>) {
  return alovaPut<Article>(`/articles/${id}`, payload);
}

export async function deleteArticle(id: string) {
  return alovaDelete<{ id: string }>(`/articles/${id}`);
}
