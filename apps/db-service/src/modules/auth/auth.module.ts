import { Module } from '@nestjs/common';
import { AdminAuthController } from './admin-auth.controller';
import { AuthService } from './auth.service';
import { PlatformAuthController } from './platform-auth.controller';

@Module({
  controllers: [AdminAuthController, PlatformAuthController],
  providers: [AuthService],
})
export class AuthModule {}
