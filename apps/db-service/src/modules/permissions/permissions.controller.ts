import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminAuth } from '@/common/decorators/auth.decorator';
import { paginated, success } from '@/common/http/api-result';
import {
  createPermissionSchema,
  listPermissionsQuery,
  permissionIdParam,
  updatePermissionSchema,
  type CreatePermissionInput,
  type ListPermissionsQuery,
  type UpdatePermissionInput,
} from './schemas';
import { PermissionsAdminService } from './permissions.service';

@ApiTags('Permissions')
@Controller('permissions')
@AdminAuth()
export class PermissionsController {
  constructor(private readonly permissions: PermissionsAdminService) {}

  @Get()
  @ApiOperation({ summary: 'List permissions, with optional hierarchy' })
  async list(@Query({ schema: listPermissionsQuery }) query: ListPermissionsQuery) {
    const { data, total, page, pageSize } = await this.permissions.list(query);
    return paginated(data, total, page, pageSize, '权限列表查询成功');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a permission' })
  async findOne(@Param('id', { schema: permissionIdParam }) id: number) {
    return success(await this.permissions.findOne(id), '权限详情查询成功');
  }

  @Post()
  @ApiOperation({ summary: 'Create a permission' })
  async create(@Body({ schema: createPermissionSchema }) body: CreatePermissionInput) {
    return success(await this.permissions.create(body), '权限创建成功', 201);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a permission' })
  async update(
    @Param('id', { schema: permissionIdParam }) id: number,
    @Body({ schema: updatePermissionSchema }) body: UpdatePermissionInput,
  ) {
    return success(await this.permissions.update(id, body), '权限更新成功');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a permission' })
  async remove(@Param('id', { schema: permissionIdParam }) id: number) {
    return success(await this.permissions.remove(id), '权限删除成功');
  }
}
