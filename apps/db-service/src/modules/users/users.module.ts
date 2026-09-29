import { Module } from '@nestjs/common';
import { PlatformUsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [PlatformUsersController],
  providers: [UsersService],
})
export class UsersModule {}
