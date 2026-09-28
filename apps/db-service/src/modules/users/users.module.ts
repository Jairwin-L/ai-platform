import { Module } from '@nestjs/common';
import { AdminUsersController, PlatformUsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [AdminUsersController, PlatformUsersController],
  providers: [UsersService],
})
export class UsersModule {}
