import { prisma } from '@/lib/prisma';
import type { AiUsagePayload } from './types';

export async function recordAiUsage(input: {
  conversationId: string;
  latencyMs?: number;
  messageId: string;
  modelConfigId: string;
  modelId: string;
  provider: string;
  status: string;
  usage?: AiUsagePayload;
  userId: string;
}): Promise<void> {
  await prisma.aiUsage.create({
    data: {
      userId: input.userId,
      conversationId: input.conversationId,
      messageId: input.messageId,
      modelConfigId: input.modelConfigId,
      provider: input.provider,
      modelId: input.modelId,
      promptTokens: input.usage?.promptTokens,
      completionTokens: input.usage?.completionTokens,
      totalTokens: input.usage?.totalTokens,
      latencyMs: input.latencyMs,
      status: input.status,
    },
  });
}
