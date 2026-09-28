import { z } from 'zod';

/** 邮箱：统一小写并去空白，避免同一邮箱因大小写产生重复账号 */
export const emailSchema = z.string().trim().toLowerCase().email('邮箱格式不正确').max(254);
/** 上限挡住超长输入：scrypt 对超长串的开销可被用作 DoS 手段 */
export const passwordSchema = z.string().min(8, '密码至少 8 位').max(128, '密码最多 128 位');
export const verificationCodeSchema = z.string().regex(/^\d{6}$/, '验证码必须是 6 位数字');
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

const passwordSignInSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    method: z.literal('password'),
  })
  .strict();

const codeSignInSchema = z
  .object({
    code: verificationCodeSchema,
    email: emailSchema,
    method: z.literal('code'),
  })
  .strict();

export const signInSchema = z.discriminatedUnion('method', [
  passwordSignInSchema,
  codeSignInSchema,
]);

export const resetPasswordSchema = z
  .object({
    code: verificationCodeSchema,
    password: passwordSchema,
  })
  .strict();

/**
 * 管理端登录：系统用户只按 account 登录，没有邮箱。
 *
 * encrypted=true 时 password 是 RSA 密文，长度校验放到解密之后，这里只挡超长输入。
 */
export const adminLoginSchema = z
  .object({
    account: z.string().trim().min(1, '请输入账号').max(100),
    password: z.string().min(1, '请输入密码').max(2000),
    encrypted: z.boolean().optional(),
  })
  .strict();

export type RequestVerificationCodeInput = z.infer<typeof requestVerificationCodeSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
