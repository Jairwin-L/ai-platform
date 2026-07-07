import { AUTH_ERROR, COMMON_ERROR, DATA_ERROR } from '@/constants/error-codes';
import { createErrorResponse } from './responses/error';

export {
  authCodePurposeSchema,
  emailSchema,
  passwordSchema,
  verificationCodeSchema,
} from '@/lib/auth/schemas';

export function createValidationError(message: string) {
  return createErrorResponse(COMMON_ERROR.VALIDATION_ERROR, message, null, 422);
}

export function createDuplicateEmailError() {
  return createErrorResponse(DATA_ERROR.DUPLICATE_ENTRY, '该邮箱已注册', null, 409);
}

export function createEmailNotRegisteredError() {
  return createErrorResponse(DATA_ERROR.NOT_FOUND, '该邮箱未注册', null, 404);
}

export function createUnavailableAccountError() {
  return createErrorResponse(AUTH_ERROR.FORBIDDEN, '账号不可用', null, 403);
}
