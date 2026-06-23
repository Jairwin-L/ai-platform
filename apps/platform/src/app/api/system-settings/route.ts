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
};
const supportedLanguages = new Set(['zh-CN', 'en-US']);
const supportedSessionPolicies = new Set(['standard', 'strict']);

interface SystemSettingsPayload {
  allowRegistration?: unknown;
  defaultLanguage?: unknown;
  displayName?: unknown;
  maintenanceMode?: unknown;
  sessionPolicy?: unknown;
  supportEmail?: unknown;
}

function toSettingsResponse(settings: {
  allow_registration: boolean;
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
    maintenanceMode: settings.maintenance_mode,
    sessionPolicy: settings.session_policy,
    updatedAt: settings.updated_at,
  };
}

function getStringValue(value: unknown, fieldName: string, maxLength: number): string {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }

  const trimmedValue = value.trim();
  if (!trimmedValue || trimmedValue.length > maxLength) {
    throw new Error(`${fieldName} is invalid`);
  }

  return trimmedValue;
}

function getOptionalEmail(value: unknown): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const email = getStringValue(value, 'supportEmail', 254);
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error('supportEmail is invalid');
  }

  return email;
}

function getBooleanValue(value: unknown, fieldName: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`${fieldName} must be a boolean`);
  }

  return value;
}

function getAllowedValue(value: unknown, fieldName: string, allowedValues: Set<string>): string {
  const selectedValue = getStringValue(value, fieldName, 32);
  if (!allowedValues.has(selectedValue)) {
    throw new Error(`${fieldName} is not supported`);
  }

  return selectedValue;
}

function isMissingSystemSettingsTable(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2021';
}

function getStorageErrorMessage(error: unknown, fallback: string): string {
  if (isMissingSystemSettingsTable(error)) {
    return 'System settings storage is not initialized. Run "vp run prisma:push" first.';
  }

  return fallback;
}

function validatePayload(payload: SystemSettingsPayload) {
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
  };
}

const getSystemSettingsHandler: ApiHandler = async () => {
  try {
    const settings = await prisma.systemSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...DEFAULT_SETTINGS },
      update: {},
    });

    return createSuccessResponse(toSettingsResponse(settings), 'System settings loaded');
  } catch (error) {
    return createErrorResponse(
      DATA_ERROR.QUERY_FAILED,
      getStorageErrorMessage(error, 'Unable to load system settings'),
      error,
      500,
    );
  }
};

const updateSystemSettingsHandler: ApiHandler = async (request: NextRequest) => {
  let payload: SystemSettingsPayload;
  try {
    payload = (await request.json()) as SystemSettingsPayload;
  } catch (error) {
    return createErrorResponse(DATA_ERROR.VALIDATION_FAILED, 'Request JSON is invalid', error, 400);
  }

  try {
    const data = validatePayload(payload);
    const settings = await prisma.systemSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...DEFAULT_SETTINGS, ...data },
      update: { ...data, updated_at: new Date() },
    });

    return createSuccessResponse(toSettingsResponse(settings), 'System settings updated');
  } catch (error) {
    return createErrorResponse(
      DATA_ERROR.UPDATE_FAILED,
      getStorageErrorMessage(error, 'Unable to update system settings'),
      error,
      400,
    );
  }
};

export const GET = withApiHandler(getSystemSettingsHandler);
export const PUT = withApiHandler(updateSystemSettingsHandler);
