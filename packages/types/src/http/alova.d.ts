declare namespace IAlovaHttp {
  interface MessageApi {
    success: (content: string) => unknown;
    error: (content: string) => unknown;
  }

  interface RequestMeta {
    showErrorMessage?: boolean;
    showSuccessMessage?: boolean;
    successMessage?: string;
  }

  interface ApiResponse<T = unknown> {
    code?: IServer.ResponseCode;
    data?: T;
    errorCode?: string;
    success?: boolean;
    message?: string;
    timestamp?: number;
  }

  interface ErrorResponse {
    error?: {
      message?: string;
    };
  }
}
