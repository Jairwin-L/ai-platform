import { z } from 'zod';
import { TTL_OPTION_SECONDS } from './constants';

export const credentialIdSchema = z.string().regex(/^cred_[a-f0-9]{32}$/u);
export const ttlOptionSchema = z.enum(
  Object.keys(TTL_OPTION_SECONDS) as ['7d', '2w', '3w', '4w'],
);

function hasControlCharacter(value: string): boolean {
  return Array.from(value).some((char) => {
    const code = char.charCodeAt(0);

    return code <= 31 || code === 127;
  });
}

function hasWhitespaceOrControlCharacter(value: string): boolean {
  return Array.from(value).some((char) => {
    const code = char.charCodeAt(0);

    return char.trim() === '' || code <= 31 || code === 127;
  });
}

export const saveCredentialSchema = z
  .object({
    label: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .refine((value) => !hasControlCharacter(value), '凭据名称不能包含控制字符'),
    serviceName: z
      .string()
      .trim()
      .min(1)
      .max(40)
      .regex(/^[a-z0-9][a-z0-9-]{0,39}$/u, '服务标识仅支持小写字母、数字和连字符')
      .refine((value) => !hasControlCharacter(value), '服务标识不能包含控制字符'),
    apiKey: z
      .string()
      .min(8)
      .max(1024)
      .refine((value) => value.trim() === value, 'API Key 前后不能包含空白字符')
      .refine(
        (value) => !hasWhitespaceOrControlCharacter(value),
        'API Key 不能包含空白或控制字符',
      ),
    ttlOption: ttlOptionSchema.default('7d'),
  })
  .strict();

export const overwriteCredentialSchema = saveCredentialSchema.omit({
  serviceName: true,
});

export const overwriteCredentialPayloadSchema = overwriteCredentialSchema
  .extend({
    credentialId: credentialIdSchema,
  })
  .strict();

export const saveOrOverwriteCredentialSchema = z.union([
  saveCredentialSchema,
  overwriteCredentialPayloadSchema,
]);

export type SaveCredentialInput = IThirdPartyServiceCredentials.SaveCredentialInput;
export type OverwriteCredentialInput = IThirdPartyServiceCredentials.OverwriteCredentialInput;
export type SaveOrOverwriteCredentialInput =
  IThirdPartyServiceCredentials.SaveOrOverwriteCredentialInput;
