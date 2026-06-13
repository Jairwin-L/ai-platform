export const COMMON_ERROR = {
  UNKNOWN: { code: 10000, message: 'Unknown error' },
  SYSTEM_ERROR: { code: 10001, message: 'System error' },
  PARAM_ERROR: { code: 10002, message: 'Parameter error' },
  REQUEST_ERROR: { code: 10003, message: 'Request error' },
  VALIDATION_ERROR: { code: 10004, message: 'Data validation failed' },
  RATE_LIMIT: { code: 10005, message: 'Request rate limit exceeded' },
  SERVICE_UNAVAILABLE: { code: 10006, message: 'Service temporarily unavailable' },
} as const;

export const AUTH_ERROR = {
  UNAUTHORIZED: { code: 20001, message: 'Unauthorized, please login first' },
  FORBIDDEN: { code: 20002, message: 'No access permission' },
  INVALID_TOKEN: { code: 20005, message: 'Invalid authentication session' },
} as const;

export const DATA_ERROR = {
  NOT_FOUND: { code: 50001, message: 'Data does not exist' },
  CREATE_FAILED: { code: 50002, message: 'Data creation failed' },
  UPDATE_FAILED: { code: 50003, message: 'Data update failed' },
  DELETE_FAILED: { code: 50004, message: 'Data deletion failed' },
  QUERY_FAILED: { code: 50005, message: 'Data query failed' },
  VALIDATION_FAILED: { code: 50006, message: 'Data validation failed' },
  DUPLICATE_ENTRY: { code: 50007, message: 'Data already exists' },
} as const;

export const FILE_ERROR = {
  UPLOAD_FAILED: { code: 60001, message: 'File upload failed' },
  DELETE_FAILED: { code: 60002, message: 'File deletion failed' },
  NOT_FOUND: { code: 60003, message: 'File does not exist' },
  TYPE_NOT_SUPPORTED: { code: 60004, message: 'Unsupported file type' },
  SIZE_EXCEEDED: { code: 60005, message: 'File size exceeds the limit' },
  STORAGE_ERROR: { code: 60007, message: 'Storage service error' },
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
