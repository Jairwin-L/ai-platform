declare namespace IApiArticles {
  interface Article {
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

  interface ArticleFormValues {
    title: string;
    slug: string;
    summary?: string | null;
    content: string;
    note?: string | null;
    published?: boolean;
  }

  interface ArticleListParams {
    cursor?: string | null;
    limit?: number;
    keyword?: string;
  }

  interface ArticleListPagination {
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
  }

  interface ArticleListData {
    data: Article[];
    pagination: ArticleListPagination;
  }
}
