import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSION_CODE } from '@ai/constants/permissions';
import { AdminAnyPermissionAuth, AdminPermissionAuth } from '@/common/decorators/auth.decorator';
import { success } from '@/common/http/api-result';
import { SystemSettingsService } from './system-settings.service';
import { updateSystemSettingsSchema, type UpdateSystemSettingsInput } from './schemas';

const { SETTINGS } = PERMISSION_CODE.OPERATION;

/**
 * 系统设置：只包含可公开维护的展示与访问策略，不包含任何密钥、环境变量或部署配置。
 */
@ApiTags('System Settings')
@Controller('system-settings')
export class SystemSettingsController {
  constructor(private readonly systemSettings: SystemSettingsService) {}

  @Get()
  @AdminAnyPermissionAuth(SETTINGS.READ, SETTINGS.WRITE)
  @ApiOperation({ summary: 'Get system settings' })
  async getSettings() {
    return success(await this.systemSettings.getSettings(), '系统设置查询成功');
  }

  @Put()
  @AdminPermissionAuth(SETTINGS.WRITE)
  @ApiOperation({ summary: 'Update system settings' })
  async updateSettings(
    @Body({ schema: updateSystemSettingsSchema }) payload: UpdateSystemSettingsInput,
  ) {
    return success(await this.systemSettings.updateSettings(payload), '系统设置更新成功');
  }
}
