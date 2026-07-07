import { AiPublicError } from '../errors';
import type { AiChatAdapter, AiChatAdapterChunk, AiChatAdapterInput } from '../types';

export class AnthropicAdapter implements AiChatAdapter {
  async *streamChat(input: AiChatAdapterInput): AsyncGenerator<AiChatAdapterChunk> {
    void input;

    if (Date.now() < 0) {
      yield { type: 'done' };
    }

    throw new AiPublicError('PROVIDER_NOT_AVAILABLE', 400, 'Anthropic Adapter 暂未实现');
  }
}
