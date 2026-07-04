export type ThirdPartyServiceOption = IThirdPartyServiceOptions.ServiceOption;
export type EnabledThirdPartyServiceOption = IThirdPartyServiceOptions.EnabledServiceOption;

const allowedServiceColors = new Set([
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

function normalizeServiceValue(value: string): string {
  if (!/^[a-z0-9][a-z0-9-]{0,39}$/u.test(value)) {
    throw new Error('service value 仅支持小写字母、数字和连字符');
  }

  return value;
}

function normalizeServiceOption(value: unknown): ThirdPartyServiceOption {
  if (typeof value !== 'object' || value === null || !('value' in value)) {
    throw new Error('thirdPartyServiceOptions 包含无效项');
  }

  const option = value as Partial<ThirdPartyServiceOption>;
  const serviceValue = normalizeServiceValue(getStringField(option.value, 'service value', 40));
  const color = getStringField(option.color, 'service color', 32);

  if (!allowedServiceColors.has(color)) {
    throw new Error('service color 不受支持');
  }

  return {
    value: serviceValue,
    label: getStringField(option.label, 'service label', 40),
    color,
    apiKeyUrl: getOptionalUrlField(option.apiKeyUrl, 'apiKeyUrl', 2048),
    enabled: getBooleanField(option.enabled, 'service enabled'),
  };
}

export function normalizeThirdPartyServiceOptions(value: unknown): ThirdPartyServiceOption[] {
  if (!Array.isArray(value)) {
    throw new Error('thirdPartyServiceOptions 必须是数组');
  }

  const selectedValues = new Set<string>();
  const normalizedOptions: ThirdPartyServiceOption[] = [];

  for (const item of value) {
    const normalizedOption = normalizeServiceOption(item);

    if (selectedValues.has(normalizedOption.value)) {
      throw new Error('thirdPartyServiceOptions 包含重复服务');
    }

    selectedValues.add(normalizedOption.value);
    normalizedOptions.push(normalizedOption);
  }

  return normalizedOptions;
}

export function getEnabledThirdPartyServiceOptions(
  options: ThirdPartyServiceOption[],
): EnabledThirdPartyServiceOption[] {
  return options
    .filter((option) => option.enabled)
    .map(({ enabled: _enabled, ...option }) => option);
}
