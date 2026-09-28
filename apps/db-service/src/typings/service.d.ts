/// <reference types="multer" />

/**
 * db-service 自有的 ambient 类型；前后端共用的接口类型在 packages/types。
 */

/** Redis 会话里保存的内容：只有用户 id，账号状态与权限每个请求实时复核 */
interface AuthSession {
  userId: string;
  createdAt: number;
}

/** 经过 SessionGuard 注入到 request.user 的当前登录用户 */
interface AuthUser {
  userId: string;
  roles: string[];
  permissions: string[];
}

interface ErrorType {
  code: string;
  message: string;
}

interface ApiErrorResponse {
  code: string;
  success: false;
  message: string;
  errorCode: string;
  errorDetail?: unknown;
  data: null;
  timestamp: number;
}

interface ApiSuccessResponse<T = unknown> {
  code: number;
  success: true;
  message: string;
  data: T;
  timestamp: number;
}
