import { Module } from '@nestjs/common';
import { PermissionsController } from './permissions.controller';
import { PermissionsAdminService } from './permissions.service';

@Module({
  controllers: [PermissionsController],
  providers: [PermissionsAdminService],
})
export class PermissionsAdminModule {}
