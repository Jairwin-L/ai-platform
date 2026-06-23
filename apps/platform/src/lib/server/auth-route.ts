import { z } from 'zod';
import { AUTH_ERROR, COMMON_ERROR, DATA_ERROR } from '@/constants/error-codes';
import { createErrorResponse } from './responses/error';

export const emailSchema = z.string().trim().email().max(254);
export const passwordSchema = z.string().min(8).max(128);
export const verificationCodeSchema = z.string().regex(/^\d{6}$/);
export const authCodePurposeSchema = z.enum(['sign-in', 'sign-up']);

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
