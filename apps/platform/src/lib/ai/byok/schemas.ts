import { z } from 'zod';
import {
  BYOK_ALLOWED_CHAT_MODELS,
  BYOK_CHAT_LIMITS,
  BYOK_TTL_OPTION_SECONDS,
  SUPPORTED_BYOK_PROVIDERS,
} from './constants';

export const providerSchema = z.enum(SUPPORTED_BYOK_PROVIDERS);
export const credentialIdSchema = z.string().regex(/^cred_[a-f0-9]{32}$/u);
export const ttlOptionSchema = z.enum(
  Object.keys(BYOK_TTL_OPTION_SECONDS) as ['7d', '2w', '3w', '4w'],
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

export const saveApiCredentialSchema = z.object({
  provider: providerSchema,
  label: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .refine((value) => !hasControlCharacter(value), 'Label 不能包含控制字符'),
  apiKey: z
    .string()
    .min(8)
    .max(512)
    .refine((value) => value.trim() === value, 'API Key 前后不能包含空白字符')
    .refine(
      (value) => !hasWhitespaceOrControlCharacter(value),
      'API Key 不能包含空白或控制字符',
    ),
  ttlOption: ttlOptionSchema.default('7d'),
}).strict();

export const overwriteApiCredentialSchema = saveApiCredentialSchema.omit({
  provider: true,
});

export const overwriteApiCredentialPayloadSchema = overwriteApiCredentialSchema
  .extend({
    credentialId: credentialIdSchema,
  })
  .strict();

export const saveOrOverwriteApiCredentialSchema = z.union([
  saveApiCredentialSchema,
  overwriteApiCredentialPayloadSchema,
]);

const chatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().min(1).max(BYOK_CHAT_LIMITS.maxMessageLength),
}).strict();

export const chatRequestSchema = z
  .object({
    credentialId: credentialIdSchema,
    model: z.enum(BYOK_ALLOWED_CHAT_MODELS),
    messages: z.array(chatMessageSchema).min(1).max(BYOK_CHAT_LIMITS.maxMessages),
  })
  .strict()
  .superRefine((value, context) => {
    const totalLength = value.messages.reduce((sum, message) => sum + message.content.length, 0);

    if (totalLength > BYOK_CHAT_LIMITS.maxTotalLength) {
      context.addIssue({
        code: 'custom',
        path: ['messages'],
        message: '消息总长度超出限制',
      });
    }
  });

export type ChatRequestInput = IByok.ChatRequestInput;
export type SaveApiCredentialInput = IByok.SaveApiCredentialInput;
export type OverwriteApiCredentialInput = IByok.OverwriteApiCredentialInput;
export type SaveOrOverwriteApiCredentialInput = IByok.SaveOrOverwriteApiCredentialInput;
