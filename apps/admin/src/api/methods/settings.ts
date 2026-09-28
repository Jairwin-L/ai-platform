/**
 * @file 系统设置、AI Provider、第三方服务配置接口，对应 apps/db-service 的同名控制器。
 */
import { SETTINGS } from '../const';
import { del, get, post, put } from '../request';

export type SystemSettings = IApiAdmin.SystemSettings;
export type SystemSettingsPayload = IApiAdmin.SystemSettingsPayload;
export type AiProviderOption = IApiAdmin.AiProviderOption;
export type ThirdPartyServiceOption = IApiAdmin.ThirdPartyServiceOption;

export function getSystemSettings() {
  return get<SystemSettings>(SETTINGS.SYSTEM);
}

export function updateSystemSettings(payload: SystemSettingsPayload) {
  return put<SystemSettings>(SETTINGS.SYSTEM, { ...payload });
}

function providerUrl(value: string) {
  return `${SETTINGS.AI_PROVIDERS}/${encodeURIComponent(value)}`;
}

export function getAiProviderOptions() {
  return get<AiProviderOption[]>(SETTINGS.AI_PROVIDERS);
}

export function getAiProviderOption(value: string) {
  return get<AiProviderOption>(providerUrl(value));
}

export function createAiProviderOption(payload: AiProviderOption) {
  return post<AiProviderOption>(SETTINGS.AI_PROVIDERS, { ...payload });
}

export function updateAiProviderOption(value: string, payload: AiProviderOption) {
  return put<AiProviderOption>(providerUrl(value), { ...payload });
}

export function deleteAiProviderOption(value: string) {
  return del<{ value: string }>(providerUrl(value));
}

function serviceUrl(value: string) {
  return `${SETTINGS.THIRD_PARTY_SERVICES}/${encodeURIComponent(value)}`;
}

export function getThirdPartyServiceOptions() {
  return get<ThirdPartyServiceOption[]>(SETTINGS.THIRD_PARTY_SERVICES);
}

export function getThirdPartyServiceOption(value: string) {
  return get<ThirdPartyServiceOption>(serviceUrl(value));
}

export function createThirdPartyServiceOption(payload: ThirdPartyServiceOption) {
  return post<ThirdPartyServiceOption>(SETTINGS.THIRD_PARTY_SERVICES, { ...payload });
}

export function updateThirdPartyServiceOption(value: string, payload: ThirdPartyServiceOption) {
  return put<ThirdPartyServiceOption>(serviceUrl(value), { ...payload });
}

export function deleteThirdPartyServiceOption(value: string) {
  return del<{ value: string }>(serviceUrl(value));
}
