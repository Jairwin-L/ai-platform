import { Module } from '@nestjs/common';
import { AiChatController } from './ai-chat.controller';
import { AiConversationsController } from './ai-conversations.controller';
import { AiModelConfigsController } from './ai-model-configs.controller';
import {
  AiProviderConfigsController,
  AiProviderOptionsController,
} from './ai-provider-configs.controller';
import { ByokCredentialsController } from './byok-credentials.controller';
import {
  ThirdPartyCredentialsController,
  ThirdPartyServiceOptionsController,
} from './third-party-credentials.controller';

/**
 * AI 对话、BYOK 凭据与第三方服务凭据。领域逻辑在 src/lib（从原 Next API 整体迁来，
 * 测试覆盖在 tests/byok-*），这里只负责鉴权、限流与参数入口。
 */
@Module({
  controllers: [
    AiChatController,
    AiConversationsController,
    AiModelConfigsController,
    AiProviderConfigsController,
    AiProviderOptionsController,
    ByokCredentialsController,
    ThirdPartyCredentialsController,
    ThirdPartyServiceOptionsController,
  ],
})
export class AiModule {}
