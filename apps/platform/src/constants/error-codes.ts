export const COMMON_ERROR = {
  UNKNOWN: { code: 10000, message: '未知错误' },
  SYSTEM_ERROR: { code: 10001, message: '系统错误' },
  PARAM_ERROR: { code: 10002, message: '参数错误' },
  REQUEST_ERROR: { code: 10003, message: '请求错误' },
  VALIDATION_ERROR: { code: 10004, message: '数据校验失败' },
  RATE_LIMIT: { code: 10005, message: '请求过于频繁，请稍后再试' },
  SERVICE_UNAVAILABLE: { code: 10006, message: '服务暂时不可用' },
} as const;

export const AUTH_ERROR = {
  UNAUTHORIZED: { code: 20001, message: '未登录或登录已失效，请先登录' },
  FORBIDDEN: { code: 20002, message: '无访问权限' },
  INVALID_TOKEN: { code: 20005, message: '登录状态无效' },
} as const;

export const DATA_ERROR = {
  NOT_FOUND: { code: 50001, message: '数据不存在' },
  CREATE_FAILED: { code: 50002, message: '数据创建失败' },
  UPDATE_FAILED: { code: 50003, message: '数据更新失败' },
  DELETE_FAILED: { code: 50004, message: '数据删除失败' },
  QUERY_FAILED: { code: 50005, message: '数据查询失败' },
  VALIDATION_FAILED: { code: 50006, message: '数据校验失败' },
  DUPLICATE_ENTRY: { code: 50007, message: '数据已存在' },
} as const;

export const FILE_ERROR = {
  UPLOAD_FAILED: { code: 60001, message: '文件上传失败' },
  DELETE_FAILED: { code: 60002, message: '文件删除失败' },
  NOT_FOUND: { code: 60003, message: '文件不存在' },
  TYPE_NOT_SUPPORTED: { code: 60004, message: '不支持的文件类型' },
  SIZE_EXCEEDED: { code: 60005, message: '文件大小超出限制' },
  COMPRESS_FAILED: { code: 60006, message: '文件压缩失败' },
  STORAGE_ERROR: { code: 60007, message: '存储服务错误' },
} as const;

export const ERROR_CODE_GROUPS = [COMMON_ERROR, AUTH_ERROR, DATA_ERROR, FILE_ERROR] as const;

const errorCodes: Record<string, { code: number; message: string }> = {};

for (const group of ERROR_CODE_GROUPS) {
  for (const [key, value] of Object.entries(group)) {
    if (!(key in errorCodes)) {
      errorCodes[key] = value;
    }
  }
}

export const ERROR_CODES = errorCodes;

export const HTTP_STATUS_TO_ERROR_CODE: Record<number, number> = {
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
