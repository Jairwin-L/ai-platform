import type { AiProviderKind } from '@/generated/prisma/client';
import { AnthropicAdapter } from './anthropic';
import { GeminiAdapter } from './gemini';
import { OpenAiCompatibleAdapter } from './openai-compatible';
import type { AiChatAdapter } from '../types';

export function getAiChatAdapter(provider: AiProviderKind): AiChatAdapter {
  if (provider === 'OPENAI_COMPATIBLE') {
    return new OpenAiCompatibleAdapter();
  }

  if (provider === 'ANTHROPIC') {
    return new AnthropicAdapter();
  }

  return new GeminiAdapter();
}
