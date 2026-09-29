import { Global, Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { UserAuthQueryService } from './user-auth.query';

@Global()
@Module({
  providers: [PermissionsService, UserAuthQueryService],
  exports: [PermissionsService, UserAuthQueryService],
})
export class PermissionsModule {}
