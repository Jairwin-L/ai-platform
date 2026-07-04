import type { NextRequest } from 'next/server';
import {
  DATA_ERROR,
  createErrorResponse,
  createSuccessResponse,
  withApiHandler,
  type ApiHandler,
} from '@/lib/server';
import { prisma } from '@/lib/prisma';

const SETTINGS_ID = 1;
const DEFAULT_SETTINGS = {
  display_name: 'Next.js Starter Kit',
  support_email: null,
  default_language: 'zh-CN',
  allow_registration: true,
  maintenance_mode: false,
  session_policy: 'standard',
  byok_allowed_origins: '',
};
const supportedLanguages = new Set(['zh-CN', 'en-US']);
const supportedSessionPolicies = new Set(['standard', 'strict']);
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

function toSettingsResponse(settings: {
  allow_registration: boolean;
  byok_allowed_origins: string;
  default_language: string;
  display_name: string;
  maintenance_mode: boolean;
  session_policy: string;
  support_email: string | null;
  updated_at: Date;
}) {
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

function getStringValue(value: unknown, fieldName: string, maxLength: number): string {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} 必须是字符串`);
  }

  const trimmedValue = value.trim();
  if (!trimmedValue || trimmedValue.length > maxLength) {
    throw new Error(`${fieldName} 无效`);
  }

  return trimmedValue;
}

function getOptionalEmail(value: unknown): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const email = getStringValue(value, 'supportEmail', 254);
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error('支持邮箱无效');
  }

  return email;
}

function getBooleanValue(value: unknown, fieldName: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`${fieldName} 必须是布尔值`);
  }

  return value;
}

function getAllowedValue(value: unknown, fieldName: string, allowedValues: Set<string>): string {
  const selectedValue = getStringValue(value, fieldName, 32);
  if (!allowedValues.has(selectedValue)) {
    throw new Error(`${fieldName} 不受支持`);
  }

  return selectedValue;
}

function getOptionalStringValue(value: unknown, fieldName: string, maxLength: number): string {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  if (typeof value !== 'string') {
    throw new Error(`${fieldName} 必须是字符串`);
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length > maxLength) {
    throw new Error(`${fieldName} 无效`);
  }

  return trimmedValue;
}

function normalizeByokAllowedOrigins(value: unknown): string {
  const rawValue = getOptionalStringValue(value, 'byokAllowedOrigins', 2000);

  if (!rawValue) {
    return '';
  }

  const origins = rawValue
    .split(/[\n,]/u)
    .map((origin) => origin.trim())
    .filter(Boolean);
  const normalizedOrigins: string[] = [];

  for (const origin of origins) {
    if (origin === '*') {
      throw new Error('BYOK Origin 不允许使用通配符');
    }

    let parsed: URL;

    try {
      parsed = new URL(origin);
    } catch {
      throw new Error('BYOK Origin 格式无效');
    }

    if (
      parsed.origin !== origin ||
      parsed.pathname !== '/' ||
      parsed.search ||
      parsed.hash ||
      !['http:', 'https:'].includes(parsed.protocol)
    ) {
      throw new Error('BYOK Origin 必须是精确 origin，例如 https://example.com');
    }

    if (!normalizedOrigins.includes(parsed.origin)) {
      normalizedOrigins.push(parsed.origin);
    }
  }

  return normalizedOrigins.join('\n');
}

function isMissingSystemSettingsTable(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2021';
}

function getStorageErrorMessage(error: unknown, fallback: string): string {
  if (isMissingSystemSettingsTable(error)) {
    return '系统设置存储尚未初始化，请先执行“vp run prisma:push”。';
  }

  return fallback;
}

function validatePayload(payload: ISettingsApi.SystemSettingsPayload) {
  return {
    display_name: getStringValue(payload.displayName, 'displayName', 80),
    support_email: getOptionalEmail(payload.supportEmail),
    default_language: getAllowedValue(
      payload.defaultLanguage,
      'defaultLanguage',
      supportedLanguages,
    ),
    allow_registration: getBooleanValue(payload.allowRegistration, 'allowRegistration'),
    maintenance_mode: getBooleanValue(payload.maintenanceMode, 'maintenanceMode'),
    session_policy: getAllowedValue(
      payload.sessionPolicy,
      'sessionPolicy',
      supportedSessionPolicies,
    ),
    byok_allowed_origins: normalizeByokAllowedOrigins(payload.byokAllowedOrigins),
  };
}

const getSystemSettingsHandler: ApiHandler = async () => {
  try {
    const settings = await prisma.systemSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...DEFAULT_SETTINGS },
      update: {},
      select: systemSettingsSelect,
    });

    return createSuccessResponse(toSettingsResponse(settings), '系统设置查询成功');
  } catch (error) {
    return createErrorResponse(
      DATA_ERROR.QUERY_FAILED,
      getStorageErrorMessage(error, '系统设置查询失败'),
      error,
      500,
    );
  }
};

const updateSystemSettingsHandler: ApiHandler = async (request: NextRequest) => {
  let payload: ISettingsApi.SystemSettingsPayload;
  try {
    payload = (await request.json()) as ISettingsApi.SystemSettingsPayload;
  } catch (error) {
    return createErrorResponse(DATA_ERROR.VALIDATION_FAILED, '请求 JSON 格式无效', error, 400);
  }

  try {
    const data = validatePayload(payload);
    const settings = await prisma.systemSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...DEFAULT_SETTINGS, ...data },
      update: { ...data, updated_at: new Date() },
      select: systemSettingsSelect,
    });

    return createSuccessResponse(toSettingsResponse(settings), '系统设置更新成功');
  } catch (error) {
    return createErrorResponse(
      DATA_ERROR.UPDATE_FAILED,
      getStorageErrorMessage(error, '系统设置更新失败'),
      error,
      400,
    );
  }
};

export const GET = withApiHandler(getSystemSettingsHandler);
export const PUT = withApiHandler(updateSystemSettingsHandler);
