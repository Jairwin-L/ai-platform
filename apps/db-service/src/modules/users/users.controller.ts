import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminAuth, Auth, CurrentUser, OptionalAuth } from '@/common/decorators/auth.decorator';
import { paginated, success } from '@/common/http/api-result';
import {
  adminUpdateUserSchema,
  listUsersQuery,
  platformUpdateUserSchema,
  userIdParam,
  type AdminUpdateUserInput,
  type ListUsersQuery,
  type PlatformUpdateUserInput,
} from './schemas';
import { UsersService } from './users.service';

/** 管理后台：用户列表、详情、编辑 */
@ApiTags('Users')
@Controller('users')
export class AdminUsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @AdminAuth()
  @ApiOperation({ summary: 'List users' })
  async list(@Query({ schema: listUsersQuery }) query: ListUsersQuery) {
    const { data, total, page, pageSize } = await this.users.list(query);
    return paginated(data, total, page, pageSize, '用户列表查询成功');
  }

  @Get(':id')
  @AdminAuth()
  @ApiOperation({ summary: 'Get a user profile' })
  async findOne(@Param('id', { schema: userIdParam }) id: string, @CurrentUser() user: AuthUser) {
    return success(await this.users.getProfileOrThrow(id, user.userId, true), '用户详情查询成功');
  }

  @Put(':id')
  @AdminAuth()
  @ApiOperation({ summary: "Update a user's profile, status and roles" })
  async update(
    @Param('id', { schema: userIdParam }) id: string,
    @Body({ schema: adminUpdateUserSchema }) body: AdminUpdateUserInput,
    @CurrentUser() user: AuthUser,
  ) {
    return success(await this.users.adminUpdate(id, body, user), '用户更新成功');
  }
}

/** platform 前台：查看用户资料、编辑自己的资料 */
@ApiTags('Platform Users')
@Controller('platform/users')
export class PlatformUsersController {
  constructor(private readonly users: UsersService) {}

  @Get(':id')
  @OptionalAuth()
  @ApiOperation({ summary: 'Get a public user profile (email is only visible to the owner)' })
  async findOne(
    @Param('id', { schema: userIdParam }) id: string,
    @CurrentUser() user: AuthUser | undefined,
  ) {
    return success(await this.users.getProfileOrThrow(id, user?.userId, false), '用户详情查询成功');
  }

  @Put(':id')
  @Auth()
  @ApiOperation({ summary: 'Update the current user profile' })
  async update(
    @Param('id', { schema: userIdParam }) id: string,
    @Body({ schema: platformUpdateUserSchema }) body: PlatformUpdateUserInput,
    @CurrentUser() user: AuthUser,
  ) {
    return success(await this.users.updateOwnProfile(id, body, user), '用户更新成功');
  }
}
