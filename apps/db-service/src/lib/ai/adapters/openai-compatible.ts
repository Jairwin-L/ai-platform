import { AiPublicError } from '../errors';
import { parseSse } from '../sse';
import type { AiChatAdapter, AiChatAdapterChunk, AiChatAdapterInput } from '../types';

interface OpenAiChunk {
  choices?: Array<{
    delta?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

function getNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function buildRequestBody(input: AiChatAdapterInput) {
  const defaults = input.generationDefaults ?? {};

  return {
    model: input.model,
    messages: input.messages,
    stream: true,
    temperature: getNumber(defaults.temperature),
    top_p: getNumber(defaults.topP),
    frequency_penalty: getNumber(defaults.frequencyPenalty),
    presence_penalty: getNumber(defaults.presencePenalty),
    max_tokens: input.maxOutputTokens ?? undefined,
  };
}

export class OpenAiCompatibleAdapter implements AiChatAdapter {
  async *streamChat(input: AiChatAdapterInput): AsyncGenerator<AiChatAdapterChunk> {
    const baseUrl = input.baseUrl.replace(/\/+$/u, '');
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildRequestBody(input)),
      signal: input.signal,
    });

    if (!response.ok || !response.body) {
      throw new AiPublicError('UPSTREAM_ERROR', response.status >= 500 ? 503 : 400);
    }

    for await (const event of parseSse(response.body)) {
      if (event.data === '[DONE]') {
        yield { type: 'done' };
        return;
      }

      let chunk: OpenAiChunk;

      try {
        chunk = JSON.parse(event.data) as OpenAiChunk;
      } catch {
        continue;
      }

      const delta = chunk.choices?.[0]?.delta?.content;

      if (delta) {
        yield { type: 'delta', delta };
      }

      if (chunk.usage) {
        yield {
          type: 'usage',
          usage: {
            promptTokens: chunk.usage.prompt_tokens,
            completionTokens: chunk.usage.completion_tokens,
            totalTokens: chunk.usage.total_tokens,
          },
        };
      }
    }

    yield { type: 'done' };
  }
}
