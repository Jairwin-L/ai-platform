import { Injectable } from '@nestjs/common';
import { DATA_ERROR } from '@ai/constants/error-codes';
import { APP_NAME } from '@ai/constants';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { ApiException } from '@/common/http/api-exception';
import type { UpdateSystemSettingsInput } from './schemas';

/** 系统设置固定单行，永远只有 id = 1 这一条记录 */
const SETTINGS_ID = 1;

const DEFAULT_SETTINGS = {
  display_name: APP_NAME,
  support_email: null,
  default_language: 'zh-CN',
  allow_registration: true,
  maintenance_mode: false,
  session_policy: 'standard',
  byok_allowed_origins: '',
};

const systemSettingsSelect = {
  allow_registration: true,
  byok_allowed_origins: true,
  default_language: true,
  display_name: true,
  maintenance_mode: true,
  session_policy: true,
  support_email: true,
  updated_at: true,
} as const;

interface SystemSettingsRow {
  allow_registration: boolean;
  byok_allowed_origins: string;
  default_language: string;
  display_name: string;
  maintenance_mode: boolean;
  session_policy: string;
  support_email: string | null;
  updated_at: Date;
}

function toSettingsResponse(settings: SystemSettingsRow) {
  return {
    displayName: settings.display_name,
    supportEmail: settings.support_email ?? '',
    defaultLanguage: settings.default_language,
    allowRegistration: settings.allow_registration,
    byokAllowedOrigins: settings.byok_allowed_origins,
    maintenanceMode: settings.maintenance_mode,
    sessionPolicy: settings.session_policy,
    updatedAt: settings.updated_at,
  };
}

function getStorageErrorMessage(error: unknown, fallback: string): string {
  const isMissingTable =
    typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2021';
  return isMissingTable ? '系统设置存储尚未初始化，请先执行数据库迁移与 seed。' : fallback;
}

@Injectable()
export class SystemSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    try {
      const settings = await this.prisma.systemSettings.upsert({
        where: { id: SETTINGS_ID },
        create: { id: SETTINGS_ID, ...DEFAULT_SETTINGS },
        update: {},
        select: systemSettingsSelect,
      });
      return toSettingsResponse(settings);
    } catch (error) {
      throw new ApiException(
        DATA_ERROR.QUERY_FAILED,
        getStorageErrorMessage(error, '系统设置查询失败'),
        error,
        500,
      );
    }
  }

  async updateSettings(payload: UpdateSystemSettingsInput) {
    const data = {
      display_name: payload.displayName,
      support_email: payload.supportEmail,
      default_language: payload.defaultLanguage,
      allow_registration: payload.allowRegistration,
      maintenance_mode: payload.maintenanceMode,
      session_policy: payload.sessionPolicy,
      byok_allowed_origins: payload.byokAllowedOrigins,
    };

    try {
      const settings = await this.prisma.systemSettings.upsert({
        where: { id: SETTINGS_ID },
        create: { id: SETTINGS_ID, ...DEFAULT_SETTINGS, ...data },
        update: { ...data, updated_at: new Date() },
        select: systemSettingsSelect,
      });
      return toSettingsResponse(settings);
    } catch (error) {
      throw new ApiException(
        DATA_ERROR.UPDATE_FAILED,
        getStorageErrorMessage(error, '系统设置更新失败'),
        error,
        500,
      );
    }
  }
}
