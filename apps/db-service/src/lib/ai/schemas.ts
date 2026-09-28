import { z } from 'zod';

export const idSchema = z.string().trim().min(1).max(256);

export const generationDefaultsSchema = z
  .object({
    temperature: z.number().min(0).max(2).optional(),
    topP: z.number().min(0).max(1).optional(),
    frequencyPenalty: z.number().min(-2).max(2).optional(),
    presencePenalty: z.number().min(-2).max(2).optional(),
  })
  .strict();

export const providerConfigCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    provider: z.enum(['OPENAI_COMPATIBLE', 'ANTHROPIC', 'GEMINI']),
    baseUrl: z.string().trim().url().max(500).optional(),
    apiKey: z.string().min(8).max(2048),
    isEnabled: z.boolean().optional(),
  })
  .strict();

export const providerConfigUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    provider: z.enum(['OPENAI_COMPATIBLE', 'ANTHROPIC', 'GEMINI']).optional(),
    baseUrl: z.string().trim().url().max(500).nullable().optional(),
    apiKey: z.string().min(8).max(2048).optional(),
    isEnabled: z.boolean().optional(),
  })
  .strict();

export const modelConfigCreateSchema = z
  .object({
    providerConfigId: idSchema,
    name: z.string().trim().min(1).max(80),
    modelId: z.string().trim().min(1).max(160),
    systemPrompt: z.string().max(20_000).nullable().optional(),
    generationDefaults: generationDefaultsSchema.optional(),
    maxOutputTokens: z.number().int().min(1).max(200_000).nullable().optional(),
    isEnabled: z.boolean().optional(),
    isDefault: z.boolean().optional(),
  })
  .strict();

export const modelConfigUpdateSchema = modelConfigCreateSchema
  .omit({ providerConfigId: true })
  .extend({
    providerConfigId: idSchema.optional(),
  })
  .partial()
  .strict();

export const chatStreamSchema = z
  .object({
    conversationId: idSchema.optional(),
    modelConfigId: idSchema.optional(),
    content: z.string().trim().min(1).max(20_000),
  })
  .strict();

export const chatStopSchema = z
  .object({
    conversationId: idSchema,
    assistantMessageId: idSchema,
  })
  .strict();

export const conversationCreateSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    modelConfigId: idSchema.optional(),
    systemPrompt: z.string().max(20_000).nullable().optional(),
  })
  .strict();

export const conversationUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    modelConfigId: idSchema.nullable().optional(),
    systemPrompt: z.string().max(20_000).nullable().optional(),
  })
  .strict();

export const conversationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().trim().max(120).optional(),
});
