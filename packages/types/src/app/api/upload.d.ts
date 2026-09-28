declare namespace IUploadApi {
  interface PresignedRequestFile {
    fileName?: string;
    fileType?: string;
  }

  interface PresignedRequestBody {
    files?: PresignedRequestFile[];
    path?: string;
    expiresIn?: number;
  }

  interface PresignedUrlItem {
    url: string;
    key: string;
    fileName: string;
    expiresAt: string;
    maxFileSize: number;
  }

  interface PresignedResponse {
    success: boolean;
    data?: PresignedUrlItem[];
    message?: string;
  }

  interface StorageConfig {
    endpointUrl: string;
    bucketName: string;
  }
}
