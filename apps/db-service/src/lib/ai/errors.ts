import type { AiErrorCode } from './types';
import { BYOK_ERROR_CODE, type ByokErrorCode } from './byok/constants';
import { ByokPublicError } from './byok/errors';

const ERROR_MESSAGES: Record<AiErrorCode, string> = {
  AI_PROVIDER_UNAVAILABLE: 'AI Provider 暂时不可用，请稍后重试。',
  BYOK_KEY_INVALID: 'AI Key 无效或已被撤销，请重新保存。',
  BYOK_KEY_UNAVAILABLE: '未找到有效的 AI Key，请重新保存。',
  CONVERSATION_BUSY: '当前会话正在生成，请稍后再试',
  CONVERSATION_DELETED: '会话已删除',
  FORBIDDEN: '无权访问该资源',
  INVALID_BASE_URL: 'Base URL 不允许访问',
  INVALID_REQUEST: '请求参数无效',
  MODEL_NOT_AVAILABLE: '模型不可用',
  NOT_FOUND: '资源不存在',
  PROVIDER_NOT_AVAILABLE: 'Provider 不可用',
  RATE_LIMITED: '请求过于频繁，请稍后再试。',
  STREAM_ABORTED: '生成已中止',
  UNSUPPORTED_PROVIDER: '暂不支持该 AI Provider。',
  UNAUTHORIZED: '请先登录',
  UPSTREAM_ERROR: '模型服务请求失败',
};

const BYOK_TO_AI_ERROR_CODE: Record<ByokErrorCode, AiErrorCode> = {
  [BYOK_ERROR_CODE.AI_PROVIDER_UNAVAILABLE]: 'AI_PROVIDER_UNAVAILABLE',
  [BYOK_ERROR_CODE.BYOK_KEY_INVALID]: 'BYOK_KEY_INVALID',
  [BYOK_ERROR_CODE.BYOK_KEY_UNAVAILABLE]: 'BYOK_KEY_UNAVAILABLE',
  [BYOK_ERROR_CODE.FORBIDDEN]: 'FORBIDDEN',
  [BYOK_ERROR_CODE.INTERNAL_ERROR]: 'UPSTREAM_ERROR',
  [BYOK_ERROR_CODE.INVALID_REQUEST]: 'INVALID_REQUEST',
  [BYOK_ERROR_CODE.RATE_LIMITED]: 'RATE_LIMITED',
  [BYOK_ERROR_CODE.UNAUTHENTICATED]: 'UNAUTHORIZED',
  [BYOK_ERROR_CODE.UNSUPPORTED_PROVIDER]: 'UNSUPPORTED_PROVIDER',
};

export class AiPublicError extends Error {
  code: AiErrorCode;
  status: number;

  constructor(code: AiErrorCode, status = 400, message = ERROR_MESSAGES[code]) {
    super(message);
    this.name = 'AiPublicError';
    this.code = code;
    this.status = status;
  }
}

function getErrorCodeByStatus(status: number): AiErrorCode {
  if (status === 401) {
    return 'UNAUTHORIZED';
  }

  if (status === 403) {
    return 'FORBIDDEN';
  }

  if (status >= 500) {
    return 'UPSTREAM_ERROR';
  }

  return 'INVALID_REQUEST';
}

export function toAiPublicError(error: unknown): AiPublicError {
  if (error instanceof AiPublicError) {
    return error;
  }

  if (error instanceof ByokPublicError) {
    return new AiPublicError(BYOK_TO_AI_ERROR_CODE[error.code], error.status, error.message);
  }

  if (typeof error === 'object' && error !== null && 'status' in error && 'message' in error) {
    const status = typeof error.status === 'number' ? error.status : 500;
    const message = typeof error.message === 'string' ? error.message : undefined;

    return new AiPublicError(getErrorCodeByStatus(status), status, message);
  }

  return new AiPublicError('UPSTREAM_ERROR', 500);
}
