import { BYOK_ERROR_CODE, type ByokErrorCode } from './constants';

const DEFAULT_MESSAGES: Record<ByokErrorCode, string> = {
  [BYOK_ERROR_CODE.UNAUTHENTICATED]: '请先登录后再操作。',
  [BYOK_ERROR_CODE.FORBIDDEN]: '当前请求不允许访问。',
  [BYOK_ERROR_CODE.INVALID_REQUEST]: '请求参数无效。',
  [BYOK_ERROR_CODE.UNSUPPORTED_PROVIDER]: '暂不支持该 AI Provider。',
  [BYOK_ERROR_CODE.BYOK_KEY_UNAVAILABLE]: '未找到有效的 AI Key，请重新保存。',
  [BYOK_ERROR_CODE.BYOK_KEY_INVALID]: 'AI Key 无效或已被撤销，请重新保存。',
  [BYOK_ERROR_CODE.RATE_LIMITED]: '请求过于频繁，请稍后再试。',
  [BYOK_ERROR_CODE.AI_PROVIDER_UNAVAILABLE]: 'AI Provider 暂时不可用，请稍后重试。',
  [BYOK_ERROR_CODE.INTERNAL_ERROR]: '服务暂时不可用，请稍后重试。',
};

export class ByokPublicError extends Error {
  code: ByokErrorCode;
  status: number;

  constructor(code: ByokErrorCode, status: number, message = DEFAULT_MESSAGES[code]) {
    super(message);
    this.name = 'ByokPublicError';
    this.code = code;
    this.status = status;
  }
}

export function toByokPublicError(error: unknown): ByokPublicError {
  if (error instanceof ByokPublicError) {
    return error;
  }

  return new ByokPublicError(BYOK_ERROR_CODE.INTERNAL_ERROR, 500);
}
