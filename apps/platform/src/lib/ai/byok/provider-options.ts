import { BYOK_PROVIDER_VALUE_PATTERN } from './constants';

export type AiProviderOption = IByok.AiProviderOption;
export type EnabledAiProviderOption = IByok.EnabledAiProviderOption;

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

export function getEnabledAiProviderOptions(
  options: AiProviderOption[],
): EnabledAiProviderOption[] {
  return options
    .filter((option) => option.enabled)
    .map(({ enabled: _enabled, ...option }) => option);
}
