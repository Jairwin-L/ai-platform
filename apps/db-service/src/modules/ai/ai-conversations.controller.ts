import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { z } from 'zod';
import { AiAuth } from '@/common/decorators/byok.decorator';
import { CurrentUser } from '@/common/decorators/auth.decorator';
import { success } from '@/common/http/api-result';
import {
  conversationCreateSchema,
  conversationListQuerySchema,
  conversationUpdateSchema,
  idSchema,
} from '@/lib/ai/schemas';
import {
  createConversation,
  deleteConversation,
  getConversationMessages,
  listConversations,
  updateConversation,
} from '@/lib/ai/service';

type ConversationListQuery = z.infer<typeof conversationListQuerySchema>;
type ConversationCreateInput = z.infer<typeof conversationCreateSchema>;
type ConversationUpdateInput = z.infer<typeof conversationUpdateSchema>;

@ApiTags('AI Chat')
@Controller('platform/ai/conversations')
@AiAuth()
export class AiConversationsController {
  @Get()
  @ApiOperation({ summary: 'List conversations' })
  async list(
    @CurrentUser() user: AuthUser,
    @Query({ schema: conversationListQuerySchema }) query: ConversationListQuery,
  ) {
    return success(await listConversations(user.userId, query));
  }

  @Post()
  @ApiOperation({ summary: 'Create a conversation' })
  async create(
    @CurrentUser() user: AuthUser,
    @Body({ schema: conversationCreateSchema }) body: ConversationCreateInput,
  ) {
    return success(await createConversation(user.userId, body), '会话创建成功');
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Get conversation messages' })
  async messages(@CurrentUser() user: AuthUser, @Param('id', { schema: idSchema }) id: string) {
    return success(await getConversationMessages(user.userId, id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a conversation' })
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: conversationUpdateSchema }) body: ConversationUpdateInput,
  ) {
    return success(await updateConversation(user.userId, id, body), '会话更新成功');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a conversation' })
  async remove(@CurrentUser() user: AuthUser, @Param('id', { schema: idSchema }) id: string) {
    await deleteConversation(user.userId, id);
    return success({ deleted: true }, '会话删除成功');
  }
}
