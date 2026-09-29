import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSION_CODE } from '@ai/constants/permissions';
import {
  AdminAnyPermissionAuth,
  AdminPermissionAuth,
  CurrentUser,
} from '@/common/decorators/auth.decorator';
import { paginated, success } from '@/common/http/api-result';
import { requiredIdParam } from '@/common/schemas/params';
import {
  createUserSchema,
  listUsersQuery,
  removeUsersSchema,
  updateUserSchema,
  type CreateUserInput,
  type ListUsersQuery,
  type RemoveUsersInput,
  type UpdateUserInput,
} from './schemas';
import { UsersService } from './users.service';

const userIdParam = requiredIdParam('用户 id 不能为空');

const { ROLE, USER } = PERMISSION_CODE.OPERATION;

@ApiTags('System Users')
@Controller('auth/users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  // 角色管理的「分配用户」弹窗也要拉系统用户列表
  @AdminAnyPermissionAuth(USER.READ, ROLE.ASSIGN_USER)
  @ApiOperation({ summary: 'List system users' })
  async list(@Query({ schema: listUsersQuery }) query: ListUsersQuery) {
    const { data, total, page, pageSize } = await this.users.list(query);
    return paginated(data, total, page, pageSize, '用户列表查询成功');
  }

  @Post()
  @AdminPermissionAuth(USER.CREATE)
  @ApiOperation({ summary: 'Create a system user' })
  async create(
    @Body({ schema: createUserSchema }) body: CreateUserInput,
    @CurrentUser() user: AuthUser,
  ) {
    return success(await this.users.create(body, user), '用户创建成功', 201);
  }

  @Get(':id')
  @AdminAnyPermissionAuth(USER.READ, USER.EDIT)
  @ApiOperation({ summary: 'Get a system user' })
  async findOne(@Param('id', { schema: userIdParam }) id: string) {
    return success(await this.users.findOne(id), '用户详情查询成功');
  }

  @Put(':id')
  // 资料、启停、重置密码共用这个接口，具体要哪个权限由 UsersService 按请求内容判定
  @AdminAnyPermissionAuth(USER.EDIT, USER.SET_STATE, USER.RESET_PASSWORD)
  @ApiOperation({ summary: "Update a system user's profile / status, or reset the password" })
  async update(
    @Param('id', { schema: userIdParam }) id: string,
    @Body({ schema: updateUserSchema }) body: UpdateUserInput,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.users.update(id, body, user);
    return success(result.data, result.passwordReset ? '密码重置成功' : '用户更新成功');
  }

  @Delete()
  @AdminPermissionAuth(USER.DELETE)
  @ApiOperation({ summary: 'Delete system users in batch' })
  async removeMany(
    @Body({ schema: removeUsersSchema }) body: RemoveUsersInput,
    @CurrentUser() user: AuthUser,
  ) {
    return success(await this.users.removeMany(body.ids, user), '用户批量删除成功');
  }

  @Delete(':id')
  @AdminPermissionAuth(USER.DELETE)
  @ApiOperation({ summary: 'Delete a system user' })
  async remove(@Param('id', { schema: userIdParam }) id: string, @CurrentUser() user: AuthUser) {
    await this.users.removeMany([id], user);
    return success({ id }, '用户删除成功');
  }
}
