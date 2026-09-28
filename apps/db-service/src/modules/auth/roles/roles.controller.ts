import { Body, Controller, Delete, Get, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSION_CODE } from '@ai/constants/permissions';
import {
  AdminAnyPermissionAuth,
  AdminPermissionAuth,
  CurrentUser,
} from '@/common/decorators/auth.decorator';
import { paginated, success } from '@/common/http/api-result';
import {
  createRoleSchema,
  pageQueryRolesQuery,
  queryRolesQuery,
  roleIdQuery,
  setRoleUserSchema,
  updateRoleSchema,
  type CreateRoleInput,
  type PageQueryRolesQuery,
  type QueryRolesQuery,
  type RoleIdQuery,
  type SetRoleUserInput,
  type UpdateRoleInput,
} from './schemas';
import { RolesService } from './roles.service';

const { ROLE, USER } = PERMISSION_CODE.OPERATION;

/** 角色选项：用户的新增 / 编辑 / 筛选、角色编辑页都要用，不能只认「查看角色」 */
const ROLE_OPTION_PERMISSIONS = [ROLE.READ, ROLE.EDIT, USER.READ, USER.CREATE, USER.ASSIGN_ROLE];

@ApiTags('Roles')
@Controller('auth/roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get('page-query-list')
  @AdminPermissionAuth(ROLE.READ)
  @ApiOperation({ summary: 'Page-query roles with assigned permissions' })
  async pageQueryList(@Query({ schema: pageQueryRolesQuery }) query: PageQueryRolesQuery) {
    const { data, total, page, pageSize } = await this.roles.pageQueryList(query);
    return paginated(data, total, page, pageSize, '角色列表查询成功');
  }

  @Get('query-list')
  @AdminAnyPermissionAuth(...ROLE_OPTION_PERMISSIONS)
  @ApiOperation({ summary: 'Query roles by enabled state' })
  async queryList(@Query({ schema: queryRolesQuery }) query: QueryRolesQuery) {
    return success(await this.roles.queryList(query), '角色列表查询成功');
  }

  @Get('query-role-user-list')
  @AdminAnyPermissionAuth(ROLE.READ, ROLE.ASSIGN_USER)
  @ApiOperation({ summary: 'Query system users under a role' })
  async queryRoleUserList(@Query({ schema: roleIdQuery }) query: RoleIdQuery) {
    return success(await this.roles.queryRoleUserList(query.id), '角色用户查询成功');
  }

  @Post('set-role-user')
  @AdminPermissionAuth(ROLE.ASSIGN_USER)
  @ApiOperation({ summary: 'Batch assign system users to a role (incremental add and remove)' })
  async setRoleUser(
    @Body({ schema: setRoleUserSchema }) body: SetRoleUserInput,
    @CurrentUser() user: AuthUser,
  ) {
    return success(await this.roles.setRoleUser(body, user), '角色用户更新成功');
  }

  @Get()
  @AdminAnyPermissionAuth(...ROLE_OPTION_PERMISSIONS)
  @ApiOperation({ summary: 'List all roles with assigned permissions' })
  async list() {
    return success(await this.roles.list(), '角色列表查询成功');
  }

  @Post()
  @AdminPermissionAuth(ROLE.CREATE)
  @ApiOperation({ summary: 'Create a role' })
  async create(
    @Body({ schema: createRoleSchema }) body: CreateRoleInput,
    @CurrentUser() user: AuthUser,
  ) {
    return success(await this.roles.create(body, user), '角色创建成功', 201);
  }

  @Put()
  // 编辑资料与启停共用这个接口，具体要哪个权限由 RolesService 按实际变更判定
  @AdminAnyPermissionAuth(ROLE.EDIT, ROLE.SET_STATE)
  @ApiOperation({ summary: 'Update a role' })
  async update(
    @Body({ schema: updateRoleSchema }) body: UpdateRoleInput,
    @CurrentUser() user: AuthUser,
  ) {
    return success(await this.roles.update(body, user), '角色更新成功');
  }

  @Delete()
  @AdminPermissionAuth(ROLE.DELETE)
  @ApiOperation({ summary: 'Delete a role' })
  async remove(@Query({ schema: roleIdQuery }) query: RoleIdQuery) {
    return success(await this.roles.remove(query.id), '角色删除成功');
  }
}
