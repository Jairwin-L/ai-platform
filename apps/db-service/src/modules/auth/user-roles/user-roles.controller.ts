import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSION_CODE } from '@ai/constants/permissions';
import {
  AdminAnyPermissionAuth,
  AdminPermissionAuth,
  CurrentUser,
} from '@/common/decorators/auth.decorator';
import { success } from '@/common/http/api-result';
import {
  updateUserRolesSchema,
  userRolesQuery,
  type UpdateUserRolesInput,
  type UserRolesQuery,
} from './schemas';
import { UserRolesService } from './user-roles.service';

const { USER } = PERMISSION_CODE.OPERATION;

@ApiTags('Roles')
@Controller('auth/user-roles')
export class UserRolesController {
  constructor(private readonly userRoles: UserRolesService) {}

  @Get()
  @AdminAnyPermissionAuth(USER.READ, USER.ASSIGN_ROLE)
  @ApiOperation({ summary: 'Query roles of a system user' })
  async query(@Query({ schema: userRolesQuery }) query: UserRolesQuery) {
    return success(await this.userRoles.queryUserRoles(query.id), '用户角色查询成功');
  }

  @Post()
  @AdminPermissionAuth(USER.ASSIGN_ROLE)
  @ApiOperation({ summary: 'Update roles assigned to a system user' })
  async update(
    @Body({ schema: updateUserRolesSchema }) body: UpdateUserRolesInput,
    @CurrentUser() user: AuthUser,
  ) {
    return success(await this.userRoles.updateUserRoles(body, user), '用户角色更新成功');
  }
}
