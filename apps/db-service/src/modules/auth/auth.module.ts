import { Module } from '@nestjs/common';
import { AdminAuthController } from './admin-auth.controller';
import { AuthService } from './auth.service';
import { PlatformAuthController } from './platform-auth.controller';
import { PermissionsController } from './permissions/permissions.controller';
import { PermissionsAdminService } from './permissions/permissions-admin.service';
import { PlatformUsersAdminController } from './platform-users/platform-users.controller';
import { RolesController } from './roles/roles.controller';
import { RolesService } from './roles/roles.service';
import { UserRolesController } from './user-roles/user-roles.controller';
import { UserRolesService } from './user-roles/user-roles.service';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';

/** 会话接口 + 管理端 RBAC（系统用户、角色、菜单资源、平台用户状态） */
@Module({
  controllers: [
    AdminAuthController,
    PlatformAuthController,
    PermissionsController,
    RolesController,
    UserRolesController,
    UsersController,
    PlatformUsersAdminController,
  ],
  providers: [AuthService, PermissionsAdminService, RolesService, UsersService, UserRolesService],
})
export class AuthModule {}
