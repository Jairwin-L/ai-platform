import { z } from 'zod';

export const emailSchema = z.string().trim().email().max(254);
export const passwordSchema = z.string().min(8).max(128);
export const verificationCodeSchema = z.string().regex(/^\d{6}$/);
export const authCodePurposeSchema = z.enum(['sign-in', 'sign-up']);

export const requestVerificationCodeSchema = z
  .object({
    email: emailSchema,
    purpose: authCodePurposeSchema,
  })
  .strict();

export const signUpSchema = z
  .object({
    code: verificationCodeSchema,
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    code: verificationCodeSchema,
    password: passwordSchema,
  })
  .strict();
