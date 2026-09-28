import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AiAuth, ByokAuth } from '@/common/decorators/byok.decorator';
import { CurrentUser } from '@/common/decorators/auth.decorator';
import { success } from '@/common/http/api-result';
import type { AuthenticatedRequest } from '@/common/types/request';
import { logger } from '@/infra/logger/logger';
import { BYOK_CHAT_LIMITS } from '@/lib/ai/byok/constants';
import { chatRequestSchema } from '@/lib/ai/byok/schemas';
import { createByokChatCompletion } from '@/lib/ai/byok/service';
import { AiPublicError, toAiPublicError } from '@/lib/ai/errors';
import { chatStopSchema, chatStreamSchema } from '@/lib/ai/schemas';
import { assertRateLimit, runWithConcurrencyLimit } from '@/lib/ai/security/rate-limit';
import {
  createRequestId,
  getRequestIp,
  parseLimitedJsonBody,
} from '@/lib/ai/security/request-security';
import {
  appendAssistantContent,
  finalizeAssistantMessage,
  prepareChatStream,
  stopAssistantMessage,
} from '@/lib/ai/service';
import { encodeSse } from '@/lib/ai/sse';
import { recordAiUsage } from '@/lib/ai/usage';
import type { z } from 'zod';

type ChatStreamInput = z.infer<typeof chatStreamSchema>;
type ChatStopInput = z.infer<typeof chatStopSchema>;

/** SSE 写出失败（连接已断开）时静默放弃，由调用方按 aborted 状态收尾 */
function writeSse(response: Response, event: string, payload: unknown): boolean {
  if (response.writableEnded || response.destroyed) return false;
  try {
    return response.write(encodeSse(event, payload));
  } catch {
    return false;
  }
}

@ApiTags('AI Chat')
@Controller('platform/ai/chat')
export class AiChatController {
  /** 直接用已保存的 BYOK 凭据发起一次非流式对话 */
  @Post()
  @HttpCode(200)
  @ByokAuth({ requireJson: true, requireOrigin: true })
  @ApiOperation({ summary: 'Create a chat completion with a saved BYOK credential' })
  async chat(
    @CurrentUser() user: AuthUser,
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    const requestId = createRequestId(request);
    const ip = getRequestIp(request);
    const baseLimit = { userId: user.userId, ip, requestId };

    await assertRateLimit({
      ...baseLimit,
      route: 'POST /api/ai/chat',
      limit: BYOK_CHAT_LIMITS.maxHourlyRequests,
      windowSeconds: 60 * 60,
    });
    await assertRateLimit({
      ...baseLimit,
      route: 'POST /api/ai/chat:daily',
      limit: BYOK_CHAT_LIMITS.maxDailyRequests,
      windowSeconds: 60 * 60 * 24,
    });

    const input = parseLimitedJsonBody(body, chatRequestSchema);
    const result = await runWithConcurrencyLimit(
      {
        ...baseLimit,
        route: 'POST /api/ai/chat',
        limit: BYOK_CHAT_LIMITS.maxConcurrentRequests,
        ttlSeconds: 60,
      },
      () => createByokChatCompletion(user.userId, input, { requestId, ip }),
    );

    return success(result);
  }

  /**
   * 以 SSE 返回一轮对话：meta → delta → done / error。
   *
   * 会话与消息的准备放在写出响应头之前：这一步的失败（模型不可用、会话忙）仍按普通 JSON 错误返回；
   * 一旦开始写 SSE，后续失败只能以 error 事件告知前端。
   */
  @Post('stream')
  @AiAuth()
  @ApiOperation({ summary: 'Send a message and stream the assistant reply (SSE)' })
  @ApiProduces('text/event-stream')
  async stream(
    @CurrentUser() user: AuthUser,
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
    @Body({ schema: chatStreamSchema }) body: ChatStreamInput,
  ): Promise<void> {
    const requestId = createRequestId(request);
    const prepared = await prepareChatStream(user.userId, body);
    const startedAt = Date.now();
    let aborted = false;

    response.on('close', () => {
      if (!response.writableFinished) aborted = true;
    });

    response.status(200);
    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    // no-transform：避免链路上的压缩中间件把事件攒成一整块再发
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders();

    const usageBase = {
      userId: user.userId,
      conversationId: prepared.conversation.id,
      messageId: prepared.assistantMessage.id,
      modelConfigId: prepared.modelConfig.id,
      provider: prepared.modelConfig.provider,
      modelId: prepared.modelConfig.modelId,
    };
    let content = '';

    writeSse(response, 'meta', {
      conversationId: prepared.conversation.id,
      userMessageId: prepared.userMessage.id,
      assistantMessageId: prepared.assistantMessage.id,
    });

    try {
      const result = await createByokChatCompletion(
        user.userId,
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
      writeSse(response, 'delta', {
        assistantMessageId: prepared.assistantMessage.id,
        delta: content,
      });
      await appendAssistantContent({ assistantMessageId: prepared.assistantMessage.id, content });
      await finalizeAssistantMessage({
        assistantMessageId: prepared.assistantMessage.id,
        conversationId: prepared.conversation.id,
        content,
        status: 'COMPLETED',
      });
      await recordAiUsage({ ...usageBase, latencyMs: Date.now() - startedAt, status: 'COMPLETED' });
      writeSse(response, 'done', { assistantMessageId: prepared.assistantMessage.id });
    } catch (error) {
      const isAbort = aborted || (error instanceof Error && error.name === 'AbortError');
      const publicError = isAbort
        ? new AiPublicError('STREAM_ABORTED', 499)
        : toAiPublicError(error);
      if (!isAbort && publicError.status >= 500) {
        logger.error({ error, requestId }, '[ai-chat] stream failed');
      }

      // 收尾失败只记日志：此时响应头已经写出，不能再改成 JSON 错误
      const cleanup = await Promise.allSettled([
        finalizeAssistantMessage({
          assistantMessageId: prepared.assistantMessage.id,
          conversationId: prepared.conversation.id,
          content,
          status: isAbort ? 'STOPPED' : 'ERROR',
          errorCode: publicError.code,
        }),
        recordAiUsage({
          ...usageBase,
          latencyMs: Date.now() - startedAt,
          status: publicError.code,
        }),
      ]);
      cleanup.forEach((item) => {
        if (item.status === 'rejected') {
          logger.error({ error: item.reason, requestId }, '[ai-chat] failed to finalize message');
        }
      });

      if (!isAbort) {
        writeSse(response, 'error', { code: publicError.code, message: publicError.message });
      }
    } finally {
      if (!response.writableEnded) response.end();
    }
  }

  @Post('stop')
  @HttpCode(200)
  @AiAuth()
  @ApiOperation({ summary: 'Stop a streaming assistant message' })
  async stop(@CurrentUser() user: AuthUser, @Body({ schema: chatStopSchema }) body: ChatStopInput) {
    await stopAssistantMessage(user.userId, body);
    return success({ stopped: true }, '生成已停止');
  }
}
