import { Module } from '@nestjs/common';
import { AiProvidersController } from '@/modules/ai-providers/ai-providers.controller';
import { ThirdPartyServicesController } from '@/modules/third-party-services/third-party-services.controller';

/** 管理后台的 AI Provider 与第三方服务配置：存储逻辑在 src/lib，这里只有控制器 */
@Module({
  controllers: [AiProvidersController, ThirdPartyServicesController],
})
export class SettingsOptionsModule {}
