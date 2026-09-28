export const COMMON_ERROR = {
  UNKNOWN: { code: 'COMMON_UNKNOWN', message: '未知错误' },
  SYSTEM_ERROR: { code: 'COMMON_SYSTEM_ERROR', message: '系统错误' },
  PARAM_ERROR: { code: 'COMMON_PARAM_ERROR', message: '参数错误' },
  REQUEST_ERROR: { code: 'COMMON_REQUEST_ERROR', message: '请求错误' },
  VALIDATION_ERROR: { code: 'COMMON_VALIDATION_ERROR', message: '数据校验失败' },
  RATE_LIMIT: { code: 'COMMON_RATE_LIMIT', message: '请求过于频繁，请稍后再试' },
  SERVICE_UNAVAILABLE: { code: 'COMMON_SERVICE_UNAVAILABLE', message: '服务暂时不可用' },
} as const;

export const AUTH_ERROR = {
  UNAUTHORIZED: { code: 'AUTH_UNAUTHORIZED', message: '未登录或登录已失效，请先登录' },
  FORBIDDEN: { code: 'AUTH_FORBIDDEN', message: '无访问权限' },
  INVALID_TOKEN: { code: 'AUTH_INVALID_TOKEN', message: '登录状态无效' },
} as const;

export const DATA_ERROR = {
  NOT_FOUND: { code: 'DATA_NOT_FOUND', message: '数据不存在' },
  CREATE_FAILED: { code: 'DATA_CREATE_FAILED', message: '数据创建失败' },
  UPDATE_FAILED: { code: 'DATA_UPDATE_FAILED', message: '数据更新失败' },
  DELETE_FAILED: { code: 'DATA_DELETE_FAILED', message: '数据删除失败' },
  QUERY_FAILED: { code: 'DATA_QUERY_FAILED', message: '数据查询失败' },
  VALIDATION_FAILED: { code: 'DATA_VALIDATION_FAILED', message: '数据校验失败' },
  DUPLICATE_ENTRY: { code: 'DATA_DUPLICATE_ENTRY', message: '数据已存在' },
} as const;

export const FILE_ERROR = {
  UPLOAD_FAILED: { code: 'FILE_UPLOAD_FAILED', message: '文件上传失败' },
  DELETE_FAILED: { code: 'FILE_DELETE_FAILED', message: '文件删除失败' },
  NOT_FOUND: { code: 'FILE_NOT_FOUND', message: '文件不存在' },
  TYPE_NOT_SUPPORTED: { code: 'FILE_TYPE_NOT_SUPPORTED', message: '不支持的文件类型' },
  SIZE_EXCEEDED: { code: 'FILE_SIZE_EXCEEDED', message: '文件大小超出限制' },
  COMPRESS_FAILED: { code: 'FILE_COMPRESS_FAILED', message: '文件压缩失败' },
  STORAGE_ERROR: { code: 'FILE_STORAGE_ERROR', message: '存储服务错误' },
} as const;

export const ERROR_CODE_GROUPS = [COMMON_ERROR, AUTH_ERROR, DATA_ERROR, FILE_ERROR] as const;

type ErrorCode = string;

const errorCodes: Record<string, { code: ErrorCode; message: string }> = {};

for (const group of ERROR_CODE_GROUPS) {
  for (const value of Object.values(group)) {
    if (!(value.code in errorCodes)) {
      errorCodes[value.code] = value;
    }
  }
}

export const ERROR_CODES = errorCodes;

export const HTTP_STATUS_TO_ERROR_CODE: Record<number, ErrorCode> = {
  400: COMMON_ERROR.PARAM_ERROR.code,
  401: AUTH_ERROR.UNAUTHORIZED.code,
  403: AUTH_ERROR.FORBIDDEN.code,
  404: DATA_ERROR.NOT_FOUND.code,
  409: DATA_ERROR.DUPLICATE_ENTRY.code,
  422: COMMON_ERROR.VALIDATION_ERROR.code,
  429: COMMON_ERROR.RATE_LIMIT.code,
  500: COMMON_ERROR.SYSTEM_ERROR.code,
  503: COMMON_ERROR.SERVICE_UNAVAILABLE.code,
} as const;
