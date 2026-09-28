import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminAuth } from '@/common/decorators/auth.decorator';
import { paginated, success } from '@/common/http/api-result';
import {
  createRoleSchema,
  listRolesQuery,
  roleIdParam,
  updateRoleSchema,
  type CreateRoleInput,
  type ListRolesQuery,
  type UpdateRoleInput,
} from './schemas';
import { RolesService } from './roles.service';

@ApiTags('Roles')
@Controller('roles')
@AdminAuth()
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'List roles' })
  async list(@Query({ schema: listRolesQuery }) query: ListRolesQuery) {
    const { data, total, page, pageSize } = await this.roles.list(query);
    return paginated(data, total, page, pageSize, '角色列表查询成功');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a role with its permission tree' })
  async findOne(@Param('id', { schema: roleIdParam }) id: number) {
    return success(await this.roles.findOne(id), '角色详情查询成功');
  }

  @Post()
  @ApiOperation({ summary: 'Create a role' })
  async create(@Body({ schema: createRoleSchema }) body: CreateRoleInput) {
    return success(await this.roles.create(body), '角色创建成功', 201);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a role' })
  async update(
    @Param('id', { schema: roleIdParam }) id: number,
    @Body({ schema: updateRoleSchema }) body: UpdateRoleInput,
  ) {
    return success(await this.roles.update(id, body), '角色更新成功');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a role' })
  async remove(@Param('id', { schema: roleIdParam }) id: number) {
    return success(await this.roles.remove(id), '角色删除成功');
  }
}
