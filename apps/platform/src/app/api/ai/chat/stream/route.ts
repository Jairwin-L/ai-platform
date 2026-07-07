import type { NextRequest } from 'next/server';
import { AiPublicError, toAiPublicError } from '@/lib/ai/errors';
import {
  createAiErrorResponse,
  getAiRequestId,
  parseJsonBySchema,
  requireAiUser,
} from '@/lib/ai/route-helpers';
import { createByokChatCompletion } from '@/lib/ai/byok/service';
import { chatStreamSchema } from '@/lib/ai/schemas';
import { encodeSse } from '@/lib/ai/sse';
import {
  appendAssistantContent,
  finalizeAssistantMessage,
  prepareChatStream,
} from '@/lib/ai/service';
import { recordAiUsage } from '@/lib/ai/usage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const encoder = new TextEncoder();

function enqueue(controller: ReadableStreamDefaultController<Uint8Array>, value: string): boolean {
  try {
    controller.enqueue(encoder.encode(value));
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const requestId = getAiRequestId();

  try {
    const userId = await requireAiUser(request, requestId);
    const input = await parseJsonBySchema(request, chatStreamSchema);
    const prepared = await prepareChatStream(userId, input);
    const startedAt = Date.now();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let content = '';

        enqueue(
          controller,
          encodeSse('meta', {
            conversationId: prepared.conversation.id,
            userMessageId: prepared.userMessage.id,
            assistantMessageId: prepared.assistantMessage.id,
          }),
        );

        try {
          const result = await createByokChatCompletion(
            userId,
            {
              credentialId: prepared.modelConfig.credentialId,
              model: prepared.modelConfig.modelId,
              messages: prepared.messages.flatMap((item) =>
                item.role === 'tool' ? [] : [{ role: item.role, content: item.content }],
              ),
            },
            { requestId },
          );
          content = result.content;
          enqueue(
            controller,
            encodeSse('delta', {
              assistantMessageId: prepared.assistantMessage.id,
              delta: content,
            }),
          );
          await appendAssistantContent({
            assistantMessageId: prepared.assistantMessage.id,
            content,
          });

          await finalizeAssistantMessage({
            assistantMessageId: prepared.assistantMessage.id,
            conversationId: prepared.conversation.id,
            content,
            status: 'COMPLETED',
          });
          await recordAiUsage({
            userId,
            conversationId: prepared.conversation.id,
            messageId: prepared.assistantMessage.id,
            modelConfigId: prepared.modelConfig.id,
            provider: prepared.modelConfig.provider,
            modelId: prepared.modelConfig.modelId,
            latencyMs: Date.now() - startedAt,
            status: 'COMPLETED',
          });
          enqueue(
            controller,
            encodeSse('done', { assistantMessageId: prepared.assistantMessage.id }),
          );
          controller.close();
        } catch (error) {
          const isAbort =
            request.signal.aborted || (error instanceof Error && error.name === 'AbortError');
          const publicError = isAbort
            ? new AiPublicError('STREAM_ABORTED', 499)
            : toAiPublicError(error);

          await finalizeAssistantMessage({
            assistantMessageId: prepared.assistantMessage.id,
            conversationId: prepared.conversation.id,
            content,
            status: isAbort ? 'STOPPED' : 'ERROR',
            errorCode: publicError.code,
          });
          await recordAiUsage({
            userId,
            conversationId: prepared.conversation.id,
            messageId: prepared.assistantMessage.id,
            modelConfigId: prepared.modelConfig.id,
            provider: prepared.modelConfig.provider,
            modelId: prepared.modelConfig.modelId,
            latencyMs: Date.now() - startedAt,
            status: publicError.code,
          });

          if (!isAbort) {
            enqueue(
              controller,
              encodeSse('error', {
                code: publicError.code,
                message: publicError.message,
              }),
            );
          }

          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'Content-Type': 'text/event-stream; charset=utf-8',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    return createAiErrorResponse(error, requestId);
  }
}
