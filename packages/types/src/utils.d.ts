declare namespace IUtils {
  type CompressStrategy = 'sharp' | 'tinify';

  interface CompressApiErrorResponse {
    message?: string;
  }

  interface UploadProgressInfo {
    progress: number;
    loaded: number;
    total: number;
  }
}
