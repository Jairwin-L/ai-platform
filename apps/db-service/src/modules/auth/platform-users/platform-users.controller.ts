import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSION_CODE } from '@ai/constants/permissions';
import { AdminPermissionAuth } from '@/common/decorators/auth.decorator';
import { paginated, success } from '@/common/http/api-result';
import { requiredIdParam } from '@/common/schemas/params';
import {
  listPlatformUsersQuery,
  updatePlatformUserStatusSchema,
  type ListPlatformUsersQuery,
  type UpdatePlatformUserStatusInput,
} from '../users/schemas';
import { UsersService } from '../users/users.service';

const platformUserIdParam = requiredIdParam('平台用户 id 不能为空');

const { PLATFORM_USER } = PERMISSION_CODE.OPERATION;

@ApiTags('Platform Users (Admin)')
@Controller('auth/platform-users')
export class PlatformUsersAdminController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @AdminPermissionAuth(PLATFORM_USER.READ)
  @ApiOperation({ summary: 'List platform registered users' })
  async list(@Query({ schema: listPlatformUsersQuery }) query: ListPlatformUsersQuery) {
    const { data, total, page, pageSize } = await this.users.listPlatformUsers(query);
    return paginated(data, total, page, pageSize, '平台用户列表查询成功');
  }

  @Put(':id/status')
  @AdminPermissionAuth(PLATFORM_USER.WRITE_PERMISSION)
  @ApiOperation({ summary: 'Update the account status of a platform registered user' })
  async updateStatus(
    @Param('id', { schema: platformUserIdParam }) id: string,
    @Body({ schema: updatePlatformUserStatusSchema }) body: UpdatePlatformUserStatusInput,
  ) {
    return success(await this.users.updatePlatformUserStatus(id, body), '平台用户状态更新成功');
  }
}
