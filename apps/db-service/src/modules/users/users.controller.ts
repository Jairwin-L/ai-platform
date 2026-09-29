import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth, CurrentUser, OptionalAuth } from '@/common/decorators/auth.decorator';
import { success } from '@/common/http/api-result';
import { platformUpdateUserSchema, userIdParam, type PlatformUpdateUserInput } from './schemas';
import { UsersService } from './users.service';

/** platform 前台：查看用户资料、编辑自己的资料；管理端的用户管理见 modules/auth */
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
    return success(await this.users.getProfileOrThrow(id, user?.userId), '用户详情查询成功');
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
