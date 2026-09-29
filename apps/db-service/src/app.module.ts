import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from '@/infra/prisma/prisma.module';
import { RedisModule } from '@/infra/redis/redis.module';
import { SessionModule } from '@/infra/session/session.module';
import { PermissionsModule } from '@/infra/permissions/permissions.module';
import { RateLimitModule } from '@/infra/rate-limit/rate-limit.module';
import { VerificationModule } from '@/infra/verification/verification.module';
import { MailModule } from '@/infra/mail/mail.module';
import { AllExceptionsFilter } from '@/common/filters/all-exceptions.filter';
import { ResponseInterceptor } from '@/common/interceptors/response.interceptor';
import { RateLimitGuard } from '@/common/guards/rate-limit.guard';
import { RequestLoggerMiddleware } from '@/common/middlewares/logger.middleware';
import { NoStoreMiddleware } from '@/common/middlewares/no-store.middleware';
import { AuthModule } from '@/modules/auth/auth.module';
import { UsersModule } from '@/modules/users/users.module';
import { SystemSettingsModule } from '@/modules/system-settings/system-settings.module';
import { SettingsOptionsModule } from '@/modules/settings-options/settings-options.module';
import { ArticlesModule } from '@/modules/articles/articles.module';
import { AiModule } from '@/modules/ai/ai.module';
import { UploadModule } from '@/modules/upload/upload.module';
import { DemoModule } from '@/modules/demo/demo.controller';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    SessionModule,
    PermissionsModule,
    RateLimitModule,
    VerificationModule,
    MailModule,
    AuthModule,
    UsersModule,
    SystemSettingsModule,
    SettingsOptionsModule,
    ArticlesModule,
    AiModule,
    UploadModule,
    DemoModule,
  ],
  providers: [
    // 限流排在所有路由守卫之前：鉴权失败本身也要计入配额，否则撞库可以绕开限流
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*path');
    // 凭据与 AI 接口禁止缓存，成功与错误响应都要带上
    consumer
      .apply(NoStoreMiddleware)
      .forRoutes('platform/user/*path', 'platform/ai/*path', 'auth/*path');
  }
}
