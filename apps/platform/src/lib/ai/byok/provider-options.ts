import { BYOK_PROVIDER_VALUE_PATTERN } from './constants';

export type AiProviderOption = IByok.AiProviderOption;
export type EnabledAiProviderOption = IByok.EnabledAiProviderOption;
export type PublicAiProviderOption = IByok.PublicAiProviderOption;

const providerProtocols = new Set<IByok.AiProviderProtocol>([
  'chat-completions',
  'generate-content',
  'messages',
]);

const allowedProviderColors = new Set([
  'blue',
  'cyan',
  'geekblue',
  'gold',
  'green',
  'lime',
  'magenta',
  'orange',
  'purple',
  'red',
  'volcano',
]);

function getStringField(value: unknown, fieldName: string, maxLength: number): string {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} 必须是字符串`);
  }

  const trimmedValue = value.trim();

  if (!trimmedValue || trimmedValue.length > maxLength) {
    throw new Error(`${fieldName} 无效`);
  }

  return trimmedValue;
}

function getStringListField(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} 必须是数组`);
  }

  const selectedValues = new Set<string>();
  const normalizedValues: string[] = [];

  for (const item of value) {
    const normalizedValue = getStringField(item, fieldName, 128);

    if (selectedValues.has(normalizedValue)) {
      throw new Error(`${fieldName} 包含重复项`);
    }

    selectedValues.add(normalizedValue);
    normalizedValues.push(normalizedValue);
  }

  if (normalizedValues.length === 0) {
    throw new Error(`${fieldName} 至少需要配置一项`);
  }

  return normalizedValues;
}

function getBooleanField(value: unknown, fieldName: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`${fieldName} 必须是布尔值`);
  }

  return value;
}

function getOptionalUrlField(
  value: unknown,
  fieldName: string,
  maxLength: number,
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new Error(`${fieldName} 必须是字符串`);
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return undefined;
  }

  if (trimmedValue.length > maxLength) {
    throw new Error(`${fieldName} 无效`);
  }

  try {
    const url = new URL(trimmedValue);

    if (url.protocol !== 'https:') {
      throw new Error(`${fieldName} 无效`);
    }

    return url.toString();
  } catch {
    throw new Error(`${fieldName} 无效`);
  }
}

function getRequiredUrlField(value: unknown, fieldName: string, maxLength: number): string {
  const url = getOptionalUrlField(value, fieldName, maxLength);

  if (!url) {
    throw new Error(`${fieldName} 无效`);
  }

  return url;
}

function getProviderProtocol(value: unknown): IByok.AiProviderProtocol {
  const protocol = getStringField(value, 'provider protocol', 64);

  if (!providerProtocols.has(protocol as IByok.AiProviderProtocol)) {
    throw new Error('provider protocol 不受支持');
  }

  return protocol as IByok.AiProviderProtocol;
}

function getStoredProviderProtocol(value: unknown): IByok.AiProviderProtocol {
  if (typeof value !== 'string' || !value.trim()) {
    return 'chat-completions';
  }

  return getProviderProtocol(value);
}

function getStoredStringListField(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const selectedValues = new Set<string>();
  const normalizedValues: string[] = [];

  for (const item of value) {
    if (typeof item !== 'string') {
      continue;
    }

    const normalizedValue = item.trim();

    if (!normalizedValue || normalizedValue.length > 128 || selectedValues.has(normalizedValue)) {
      continue;
    }

    selectedValues.add(normalizedValue);
    normalizedValues.push(normalizedValue);
  }

  return normalizedValues;
}

function normalizeProviderOption(value: unknown): AiProviderOption {
  if (typeof value !== 'object' || value === null || !('value' in value)) {
    throw new Error('aiProviderOptions 包含无效项');
  }

  const option = value as Partial<AiProviderOption>;
  const provider = getStringField(option.value, 'provider value', 40);

  if (!BYOK_PROVIDER_VALUE_PATTERN.test(provider)) {
    throw new Error('Provider 标识只能包含小写字母、数字、下划线和连字符，且必须以小写字母开头');
  }

  const color = getStringField(option.color, 'provider color', 32);

  if (!allowedProviderColors.has(color)) {
    throw new Error('provider color 不受支持');
  }

  return {
    value: provider,
    label: getStringField(option.label, 'provider label', 40),
    color,
    apiKeyUrl: getOptionalUrlField(option.apiKeyUrl, 'apiKeyUrl', 2048),
    protocol: getProviderProtocol(option.protocol),
    chatBaseUrl: getRequiredUrlField(option.chatBaseUrl, 'chatBaseUrl', 2048),
    models: getStringListField(option.models, 'models'),
    enabled: getBooleanField(option.enabled, 'provider enabled'),
  };
}

function normalizeStoredProviderOption(value: unknown): AiProviderOption {
  if (typeof value !== 'object' || value === null || !('value' in value)) {
    throw new Error('aiProviderOptions 包含无效项');
  }

  const option = value as Partial<AiProviderOption>;
  const provider = getStringField(option.value, 'provider value', 40);

  if (!BYOK_PROVIDER_VALUE_PATTERN.test(provider)) {
    throw new Error('Provider 标识只能包含小写字母、数字、下划线和连字符，且必须以小写字母开头');
  }

  const color = getStringField(option.color, 'provider color', 32);

  if (!allowedProviderColors.has(color)) {
    throw new Error('provider color 不受支持');
  }

  return {
    value: provider,
    label: getStringField(option.label, 'provider label', 40),
    color,
    apiKeyUrl: getOptionalUrlField(option.apiKeyUrl, 'apiKeyUrl', 2048),
    protocol: getStoredProviderProtocol(option.protocol),
    chatBaseUrl: getOptionalUrlField(option.chatBaseUrl, 'chatBaseUrl', 2048) ?? '',
    models: getStoredStringListField(option.models),
    enabled: getBooleanField(option.enabled, 'provider enabled'),
  };
}

export function normalizeAiProviderOptions(value: unknown): AiProviderOption[] {
  if (!Array.isArray(value)) {
    throw new Error('aiProviderOptions 必须是数组');
  }

  const selectedValues = new Set<string>();
  const normalizedOptions: AiProviderOption[] = [];

  for (const item of value) {
    const normalizedOption = normalizeProviderOption(item);

    if (selectedValues.has(normalizedOption.value)) {
      throw new Error('aiProviderOptions 包含重复 provider');
    }

    selectedValues.add(normalizedOption.value);
    normalizedOptions.push(normalizedOption);
  }

  return normalizedOptions;
}

export function normalizeStoredAiProviderOptions(value: unknown): AiProviderOption[] {
  if (!Array.isArray(value)) {
    throw new Error('aiProviderOptions 必须是数组');
  }

  const selectedValues = new Set<string>();
  const normalizedOptions: AiProviderOption[] = [];

  for (const item of value) {
    const normalizedOption = normalizeStoredProviderOption(item);

    if (selectedValues.has(normalizedOption.value)) {
      throw new Error('aiProviderOptions 包含重复 provider');
    }

    selectedValues.add(normalizedOption.value);
    normalizedOptions.push(normalizedOption);
  }

  return normalizedOptions;
}

function isConfiguredAiProviderOption(option: AiProviderOption): boolean {
  return Boolean(option.chatBaseUrl && option.models.length > 0);
}

export function getEnabledAiProviderOptions(
  options: AiProviderOption[],
): EnabledAiProviderOption[] {
  return options
    .filter((option) => option.enabled && isConfiguredAiProviderOption(option))
    .map(({ enabled: _enabled, ...option }) => option);
}

export function getPublicAiProviderOptions(options: AiProviderOption[]): PublicAiProviderOption[] {
  return options
    .filter((option) => option.enabled && isConfiguredAiProviderOption(option))
    .map(({ chatBaseUrl: _chatBaseUrl, enabled: _enabled, protocol: _protocol, ...option }) => {
      return option;
    });
}
