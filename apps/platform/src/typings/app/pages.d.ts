declare namespace IAppPages {
  interface AdminOverviewData {
    permissionCount: number;
    roleCount: number;
  }

  type UploadListFile = import('antd').UploadFile & {
    compressedSize?: number;
    originalSize?: number;
  };

  interface ArticleFormProps {
    mode: 'create' | 'edit';
    article?: IApiArticles.Article;
    articleId?: string;
  }

  interface ArticlesClientProps {
    initialData: IApiArticles.ArticleListData;
    initialKeyword: string;
  }

  interface AccountPageProps {
    params: Promise<{
      id?: string;
    }>;
  }

  interface AccountProfileContentProps {
    profile: IApiUsers.UserProfile;
  }

  interface AccountProfileFormProps {
    profile: IApiUsers.UserProfile;
  }

  interface ArticleListPageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
  }

  interface ArticleDetailPageProps {
    params: Promise<{
      id: string;
    }>;
  }
}
