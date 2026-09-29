import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSION_CODE } from '@ai/constants/permissions';
import {
  AdminAnyPermissionAuth,
  AdminPermissionAuth,
  CurrentUser,
} from '@/common/decorators/auth.decorator';
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
import { PermissionsAdminService } from './permissions-admin.service';

const { PERMISSION, ROLE } = PERMISSION_CODE.OPERATION;

@ApiTags('Permissions')
@Controller('auth/permissions')
export class PermissionsController {
  constructor(private readonly permissions: PermissionsAdminService) {}

  @Get()
  // 角色表单要拉整棵权限树做勾选，菜单表单要拉它选上级
  @AdminAnyPermissionAuth(PERMISSION.READ, PERMISSION.ASSIGN, ROLE.CREATE, ROLE.EDIT)
  @ApiOperation({ summary: 'List menu / button resources, with optional hierarchy' })
  async list(@Query({ schema: listPermissionsQuery }) query: ListPermissionsQuery) {
    const { data, total, page, pageSize } = await this.permissions.list(query);
    return paginated(data, total, page, pageSize, '权限查询成功');
  }

  @Post()
  @AdminPermissionAuth(PERMISSION.ASSIGN)
  @ApiOperation({ summary: 'Create a menu / button resource' })
  async create(@Body({ schema: createPermissionSchema }) body: CreatePermissionInput) {
    return success(await this.permissions.create(body), '权限创建成功', 201);
  }

  @Get(':id')
  @AdminAnyPermissionAuth(PERMISSION.READ, PERMISSION.ASSIGN)
  @ApiOperation({ summary: 'Get a menu / button resource' })
  async findOne(@Param('id', { schema: permissionIdParam }) id: string) {
    return success(await this.permissions.findOne(id), '权限详情查询成功');
  }

  @Put(':id')
  @AdminPermissionAuth(PERMISSION.ASSIGN)
  @ApiOperation({ summary: 'Update a menu / button resource' })
  async update(
    @Param('id', { schema: permissionIdParam }) id: string,
    @Body({ schema: updatePermissionSchema }) body: UpdatePermissionInput,
    @CurrentUser() user: AuthUser,
  ) {
    return success(await this.permissions.update(id, body, user), '权限更新成功');
  }

  @Delete(':id')
  @AdminPermissionAuth(PERMISSION.ASSIGN)
  @ApiOperation({ summary: 'Delete a menu / button resource' })
  async remove(@Param('id', { schema: permissionIdParam }) id: string) {
    return success(await this.permissions.remove(id), '权限删除成功');
  }
}
